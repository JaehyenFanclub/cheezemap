/* =====================================================
   쪽지 기능 - 기존 Spring Boot /message API 연결
   백엔드 변경 없이 대화형 메시지 UI로 연결합니다.
===================================================== */

let currentMessageTab = "inbox";
let selectedMessageUserId = null;
let selectedMessageNickname = "";
let messageComposeReturnModal = null;
let messageChatterCache = [];
let messageConversationCache = [];

function getDemoUserName() {
    return currentUser?.nickname || currentUser?.userNickname || "나";
}

function formatMessageDate(value) {
    if (!value) return "-";
    const normalized = String(value).includes("T") ? value : String(value).replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(
        currentLanguage === "ja" ? "ja-JP" : "ko-KR",
        { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }
    ).format(date);
}

function splitBackendMessageContent(content) {
    const text = String(content || "");
    const match = text.match(/^\[제목\]\s*(.*?)\n\n([\s\S]*)$/);
    if (!match) return { subject: "쪽지", body: text };
    return { subject: match[1] || "쪽지", body: match[2] || "" };
}

function joinBackendMessageContent(subject, body) {
    return `[제목] ${String(subject || "쪽지").trim()}\n\n${String(body || "").trim()}`;
}

/* =====================================================
   쪽지 번역 (리뷰 번역과 동일한 /api/translate 사용)
===================================================== */

const MESSAGE_TRANSLATION_CACHE_KEY = "cheezemap.messageTranslationCache.v1";

function readMessageTranslationCache() {
    try {
        const parsed = JSON.parse(
            localStorage.getItem(MESSAGE_TRANSLATION_CACHE_KEY) || "{}"
        );
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeMessageTranslationCache(cache) {
    try {
        localStorage.setItem(
            MESSAGE_TRANSLATION_CACHE_KEY,
            JSON.stringify(cache || {})
        );
    } catch (error) {
        console.debug("쪽지 번역 캐시 저장 실패:", error);
    }
}

function hashMessageTranslationText(text) {
    const value = String(text || "");
    let hash = 2166136261;

    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
}

function getMessageTranslationCacheKey(messageId, targetLanguage, sourceText = "") {
    return `${messageId}:${targetLanguage}:${hashMessageTranslationText(sourceText)}`;
}

function getCachedMessageTranslation(messageId, targetLanguage, sourceText = "") {
    const cache = readMessageTranslationCache();
    const entry =
        cache[getMessageTranslationCacheKey(messageId, targetLanguage, sourceText)] ||
        null;

    if (!entry?.translatedText) return null;

    if (
        entry.sourceText != null &&
        String(entry.sourceText) !== String(sourceText || "")
    ) {
        return null;
    }

    return entry;
}

function cacheMessageTranslation(
    messageId,
    targetLanguage,
    sourceText,
    translatedText,
    detectedLanguage = ""
) {
    const cache = readMessageTranslationCache();

    cache[getMessageTranslationCacheKey(messageId, targetLanguage, sourceText)] = {
        sourceText: String(sourceText || ""),
        translatedText: String(translatedText || ""),
        detectedLanguage: String(detectedLanguage || ""),
        savedAt: Date.now()
    };

    const keys = Object.keys(cache);
    if (keys.length > 300) {
        keys
            .sort(
                (a, b) =>
                    Number(cache[a]?.savedAt || 0) - Number(cache[b]?.savedAt || 0)
            )
            .slice(0, keys.length - 300)
            .forEach(key => {
                delete cache[key];
            });
    }

    writeMessageTranslationCache(cache);
}

function invalidateMessageTranslationCache(messageId) {
    if (messageId == null || messageId === "") return;

    const prefix = `${messageId}:`;
    const cache = readMessageTranslationCache();
    let changed = false;

    Object.keys(cache).forEach(key => {
        if (key.startsWith(prefix)) {
            delete cache[key];
            changed = true;
        }
    });

    if (changed) writeMessageTranslationCache(cache);
}

function detectMessageLanguage(text) {
    const value = String(text || "").trim();
    if (!value) return "";
    if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/u.test(value)) return "ko";
    if (/[ぁ-んァ-ヶー]/u.test(value)) return "ja";
    if (/[A-Za-z]/.test(value)) return "en";
    return "";
}

function getMessageLanguageLabel(language) {
    if (language === "ko") return "한국어";
    if (language === "ja") return "日本語";
    return "English";
}

function getMessageSiteLanguage() {
    return ["ko", "ja", "en"].includes(currentLanguage) ? currentLanguage : "ko";
}

function getMessageTranslateButtonLabel() {
    return currentLanguage === "ja"
        ? "翻訳"
        : currentLanguage === "en"
            ? "Translate"
            : "번역";
}

function getMessageTranslatingLabel() {
    return currentLanguage === "ja"
        ? "翻訳中..."
        : currentLanguage === "en"
            ? "Translating..."
            : "번역 중...";
}

function getMessageTranslationSourceText(subject, body) {
    const title = String(subject || "").trim();
    const content = String(body || "").trim();
    if (title && content) return `${title}\n\n${content}`;
    return title || content;
}

function renderMessageTranslationControls(messageId, subject, body) {
    const sourceText = getMessageTranslationSourceText(subject, body);
    const sourceLanguage = detectMessageLanguage(sourceText);
    const targetLanguage = getMessageSiteLanguage();

    if (!sourceText) return "";
    if (sourceLanguage && sourceLanguage === targetLanguage) return "";

    return `
        <div
            class="place-review-translation message-translation"
            data-message-translation
            data-message-id="${escapeGroupHtml(String(messageId))}"
        >
            <button
                type="button"
                class="place-review-translate-toggle"
                data-message-translate-button
            >
                <i class="ti ti-language"></i>
                <span data-message-translate-label>${getMessageTranslateButtonLabel()}</span>
            </button>

            <div
                class="place-review-translated-box"
                data-message-translated-box
                hidden
            >
                <div class="place-review-translated-head">
                    <span data-message-translated-label></span>
                    <button
                        type="button"
                        class="place-review-original-button"
                        data-message-original-button
                    >×</button>
                </div>
                <p
                    class="place-review-translated-text"
                    data-message-translated-text
                ></p>
            </div>
        </div>
    `;
}

async function requestMessageTranslation(messageId, text, targetLanguage) {
    const sourceText = String(text || "").trim();
    const cached = getCachedMessageTranslation(messageId, targetLanguage, sourceText);

    if (cached?.translatedText) return cached;

    const result = await apiRequest("/api/translate", {
        method: "POST",
        body: {
            text: sourceText,
            targetLanguage
        }
    });

    const translatedText = String(result?.translatedText || "").trim();

    if (!translatedText) {
        throw new Error(
            currentLanguage === "ja"
                ? "翻訳結果を取得できませんでした。"
                : currentLanguage === "en"
                    ? "Could not get the translation."
                    : "번역 결과를 가져오지 못했습니다."
        );
    }

    const normalized = {
        translatedText,
        detectedLanguage: String(
            result?.detectedLanguage || result?.detectedSourceLanguage || ""
        ).trim()
    };

    cacheMessageTranslation(
        messageId,
        targetLanguage,
        sourceText,
        normalized.translatedText,
        normalized.detectedLanguage
    );

    return normalized;
}

document.addEventListener("click", async event => {
    const translateButton = event.target.closest("[data-message-translate-button]");

    if (translateButton) {
        event.stopPropagation();

        const bubble = translateButton.closest(".message-conversation-bubble");
        const wrapper = translateButton.closest("[data-message-translation]");
        const messageId =
            wrapper?.dataset.messageId ||
            bubble?.dataset.messageBubbleId ||
            "";

        const sourceText =
            bubble?.querySelector("[data-message-source-text]")?.textContent?.trim() ||
            "";

        if (!sourceText || !messageId) return;

        const translatedBox = wrapper?.querySelector("[data-message-translated-box]");
        const translatedTextElement = wrapper?.querySelector(
            "[data-message-translated-text]"
        );
        const translatedLabel = wrapper?.querySelector(
            "[data-message-translated-label]"
        );
        const label = translateButton.querySelector("[data-message-translate-label]");
        const targetLanguage = getMessageSiteLanguage();

        translateButton.disabled = true;
        const previousLabel = label?.textContent || getMessageTranslateButtonLabel();
        if (label) label.textContent = getMessageTranslatingLabel();

        try {
            const result = await requestMessageTranslation(
                messageId,
                sourceText,
                targetLanguage
            );

            if (translatedTextElement && translatedBox) {
                translatedTextElement.textContent = result.translatedText;

                if (translatedLabel) {
                    translatedLabel.textContent =
                        `${getMessageLanguageLabel(targetLanguage)} · Google 번역`;
                }

                translatedBox.hidden = false;
            }
        } catch (error) {
            showToast(
                error?.message ||
                (
                    currentLanguage === "ja"
                        ? "メッセージを翻訳できませんでした。"
                        : currentLanguage === "en"
                            ? "Could not translate the message."
                            : "쪽지를 번역하지 못했습니다."
                )
            );
        } finally {
            translateButton.disabled = false;
            if (label) label.textContent = previousLabel;
        }

        return;
    }

    const originalButton = event.target.closest("[data-message-original-button]");
    if (originalButton) {
        event.stopPropagation();
        const translatedBox = originalButton.closest("[data-message-translated-box]");
        if (translatedBox) translatedBox.hidden = true;
    }
});



const MESSAGE_ACTION_TEXT = {
    ko: {
        edit: "수정",
        delete: "삭제",
        save: "저장",
        cancel: "취소",
        deleteConfirm: "이 쪽지를 삭제할까요? 삭제한 쪽지는 복구할 수 없습니다.",
        editDone: "쪽지를 수정했습니다.",
        deleteDone: "쪽지를 삭제했습니다.",
        subjectRequired: "제목과 내용을 모두 입력해 주세요."
    },
    ja: {
        edit: "編集",
        delete: "削除",
        save: "保存",
        cancel: "キャンセル",
        deleteConfirm: "このメッセージを削除しますか？削除後は元に戻せません。",
        editDone: "メッセージを編集しました。",
        deleteDone: "メッセージを削除しました。",
        subjectRequired: "件名と本文を入力してください。"
    },
    en: {
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        deleteConfirm: "Delete this message? This cannot be undone.",
        editDone: "Message updated.",
        deleteDone: "Message deleted.",
        subjectRequired: "Enter both a subject and message."
    }
};

function getMessageActionText() {
    return MESSAGE_ACTION_TEXT[currentLanguage] || MESSAGE_ACTION_TEXT.ko;
}

async function refreshOpenConversation() {
    if (!selectedMessageUserId) return;
    await openMessageConversation(selectedMessageUserId, selectedMessageNickname);
}

function startInlineMessageEdit(messageId, bubble) {
    const item = messageConversationCache.find(row => Number(row.messageId) === Number(messageId));
    if (!item || !bubble) return;

    const parsed = splitBackendMessageContent(item.content);
    const text = getMessageActionText();
    bubble.classList.add("is-editing");
    bubble.innerHTML = `
        <form class="message-inline-edit" data-message-edit-form="${messageId}">
            <label>
                <span>${currentLanguage === "ja" ? "件名" : currentLanguage === "en" ? "Subject" : "제목"}</span>
                <input type="text" name="subject" maxlength="80" value="${escapeGroupHtml(parsed.subject)}" required>
            </label>
            <label>
                <span>${currentLanguage === "ja" ? "本文" : currentLanguage === "en" ? "Message" : "내용"}</span>
                <textarea name="body" maxlength="1000" rows="4" required>${escapeGroupHtml(parsed.body)}</textarea>
            </label>
            <div class="message-inline-edit-actions">
                <button type="button" class="message-mini-button" data-message-edit-cancel>${text.cancel}</button>
                <button type="submit" class="message-mini-button primary">${text.save}</button>
            </div>
        </form>`;

    bubble.querySelector('[name="subject"]')?.focus();
    bubble.querySelector('[data-message-edit-cancel]')?.addEventListener("click", refreshOpenConversation);
    bubble.querySelector('[data-message-edit-form]')?.addEventListener("submit", async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const subject = form.elements.subject?.value.trim();
        const body = form.elements.body?.value.trim();
        if (!subject || !body) {
            showToast(text.subjectRequired);
            return;
        }
        const submit = form.querySelector('button[type="submit"]');
        if (submit) submit.disabled = true;
        try {
            await apiRequest(`/message/${messageId}/update`, {
                method: "PUT",
                auth: true,
                body: { content: joinBackendMessageContent(subject, body) }
            });
            invalidateMessageTranslationCache(messageId);
            showToast(text.editDone);
            await refreshOpenConversation();
        } catch (error) {
            showToast(error.message);
        } finally {
            if (submit) submit.disabled = false;
        }
    });
}

async function deleteOwnMessage(messageId) {
    const text = getMessageActionText();
    if (!window.confirm(text.deleteConfirm)) return;
    try {
        await apiRequest(`/message/${messageId}/delete`, {
            method: "DELETE",
            auth: true
        });
        invalidateMessageTranslationCache(messageId);
        showToast(text.deleteDone);
        await refreshOpenConversation();
    } catch (error) {
        showToast(error.message);
    }
}

async function updateMessageBadge() {
    const badge = document.getElementById("groupMessageBadge");
    if (!badge) return;

    if (!getAuthToken()) {
        badge.hidden = true;
        return;
    }

    try {
        const unread = Number(await apiRequest("/message/check", { auth: true })) || 0;
        badge.textContent = unread;
        badge.hidden = unread === 0;
    } catch {
        badge.hidden = true;
    }
}

async function loadMessageChatters() {
    if (!getAuthToken()) return [];
    const rows = await apiRequest("/message/recept", { auth: true });
    messageChatterCache = Array.isArray(rows) ? rows : [];
    return messageChatterCache;
}

function openMessageCenter(tab = "inbox") {
    if (!getAuthToken()) {
        showToast("로그인이 필요합니다.");
        openModal(loginModal);
        return;
    }
    currentMessageTab = tab;
    selectedMessageUserId = null;
    selectedMessageNickname = "";
    openModal(document.getElementById("groupMessageModal"));
    renderMessageCenter();
}

async function renderMessageCenter() {
    document.querySelectorAll("[data-message-tab]").forEach(button => {
        button.classList.toggle("active", button.dataset.messageTab === currentMessageTab);
    });

    const list = document.getElementById("messageList");
    const inboxCount = document.getElementById("messageInboxCount");
    const sentCount = document.getElementById("messageSentCount");
    if (!list) return;

    list.innerHTML = `<div class="message-list-empty"><p>쪽지를 불러오는 중...</p></div>`;

    try {
        const chatters = await loadMessageChatters();
        if (inboxCount) inboxCount.textContent = chatters.length;
        if (sentCount) sentCount.textContent = chatters.length;

        list.innerHTML = chatters.length
            ? chatters.map(chatter => {
                const nickname = chatter.Chatter || chatter.chatter || "상대방";
                const userId = chatter.userId;
                const parsed = splitBackendMessageContent(chatter.content);
                const active = String(userId) === String(selectedMessageUserId);
                return `
                    <button type="button" class="message-list-item ${active ? "active" : ""}" data-message-user-id="${userId}" data-message-nickname="${escapeGroupHtml(nickname)}">
                        ${renderMessageAvatar(chatter.photoUrl, nickname)}
                        <span class="message-list-copy">
                            <strong>${escapeGroupHtml(nickname)}</strong>
                            <b>${escapeGroupHtml(parsed.subject)}</b>
                            <small>${formatMessageDate(chatter.lastMessage)}</small>
                        </span>
                    </button>`;
            }).join("")
            : `<div class="message-list-empty"><i class="ti ti-mail-off"></i><p>아직 대화한 상대가 없습니다.</p></div>`;

        const myProfile = document.getElementById("messageMyProfile");
        if (myProfile) {
            myProfile.innerHTML = renderMyMessageProfile();
        }

        list.querySelectorAll("[data-message-user-id]").forEach(button => {
            button.addEventListener("click", () => {
                openMessageConversation(Number(button.dataset.messageUserId), button.dataset.messageNickname || "상대방");
            });
        });

        if (!selectedMessageUserId) renderEmptyMessageDetail();
    } catch (error) {
        list.innerHTML = `<div class="message-list-empty"><p>${escapeGroupHtml(error.message)}</p></div>`;
    }
}

function renderEmptyMessageDetail() {
    const panel = document.getElementById("messageDetailPanel");
    if (!panel) return;
    panel.innerHTML = `
        <div class="message-empty-state">
            <i class="ti ti-mail-opened"></i>
            <strong>대화를 선택해 주세요</strong>
            <p>주고받은 쪽지를 확인하고 답장을 보낼 수 있어요.</p>
        </div>`;
}

function getMessageProfilePhotoUrl(photoUrl) {
    const raw = String(photoUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return raw.startsWith('/') ? raw : `/${raw}`;
}

function renderMessageAvatar(photoUrl, name, extraClass = '') {
    const safeName = escapeGroupHtml(name || '사용자');
    const normalizedPhotoUrl = getMessageProfilePhotoUrl(photoUrl);

    if (!normalizedPhotoUrl) {
        return `<span class="message-avatar ${extraClass}"><i class="ti ti-user"></i></span>`;
    }

    return `
        <span class="message-avatar ${extraClass}">
            <img
                src="${escapeGroupHtml(normalizedPhotoUrl)}"
                alt="${safeName} 프로필"
                onerror="this.parentElement.classList.remove('has-photo'); this.parentElement.innerHTML='<i class=&quot;ti ti-user&quot;></i>';"
            >
        </span>`;
}

function renderMyMessageProfile() {
    const name =
        currentUser?.nickname ||
        currentUser?.userNickname ||
        currentUser?.name ||
        '나';

    const photoUrl =
        currentUser?.photoUrl ||
        currentUser?.profilePhotoUrl ||
        currentUser?.profileImageUrl ||
        '';

    return `
        <div class="message-my-profile">
            ${renderMessageAvatar(photoUrl, name, 'message-my-profile-avatar')}
            <div class="message-my-profile-copy">
                <strong>${escapeGroupHtml(name)}</strong>
                <span>내 프로필</span>
            </div>
        </div>`;
}

async function openMessageConversation(userId, nickname) {
    selectedMessageUserId = Number(userId);
    selectedMessageNickname = nickname || "상대방";

    const panel = document.getElementById("messageDetailPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="message-empty-state"><p>대화를 불러오는 중...</p></div>`;

    try {
        const rows = await apiRequest(`/message/${selectedMessageUserId}/recept`, { auth: true });
        messageConversationCache = Array.isArray(rows) ? rows : [];

        const conversationHtml = messageConversationCache.length
            ? messageConversationCache.map(item => {
                const parsed = splitBackendMessageContent(item.content);
                const mine = Boolean(item.whoSend);
                const messageId = Number(item.messageId);
                const translationId = Number.isFinite(messageId)
                    ? messageId
                    : `row-${selectedMessageUserId}-${item.messageDate || ""}`;
                const actionText = getMessageActionText();
                const canManage = mine && Number.isFinite(messageId);
                const sourceText = getMessageTranslationSourceText(
                    parsed.subject,
                    parsed.body
                );

                return `
                    <div class="message-conversation-row ${mine ? "mine" : "theirs"}">
                        <div
                            class="message-conversation-bubble"
                            ${canManage ? `data-message-bubble-id="${messageId}"` : ""}
                            data-message-id="${escapeGroupHtml(String(translationId))}"
                        >
                            <strong>${escapeGroupHtml(parsed.subject)}</strong>
                            <p data-message-body>${escapeGroupHtml(parsed.body).replaceAll("\n", "<br>")}</p>
                            <span class="message-source-text" data-message-source-text hidden>${escapeGroupHtml(sourceText)}</span>
                            ${renderMessageTranslationControls(
                                translationId,
                                parsed.subject,
                                parsed.body
                            )}
                            <div class="message-bubble-footer">
                                <small>
                                    ${formatMessageDate(item.messageDate)}${
                                        item.isEdited
                                            ? (currentLanguage === "ja" ? " · 編集済み" : currentLanguage === "en" ? " · Edited" : " · 수정됨")
                                            : ""
                                    }
                                </small>
                                ${canManage ? `
                                    <span class="message-bubble-actions">
                                        <button type="button" class="message-mini-button" data-message-edit="${messageId}">${actionText.edit}</button>
                                        <button type="button" class="message-mini-button danger" data-message-delete="${messageId}">${actionText.delete}</button>
                                    </span>` : ""}
                            </div>
                        </div>
                    </div>`;
            }).join("")
            : `<div class="message-list-empty"><p>대화 내용이 없습니다.</p></div>`;

        panel.innerHTML = `
            <article class="message-detail">
                <header>
                    <div>
                        <span>대화 상대</span>
                        <strong>${escapeGroupHtml(selectedMessageNickname)}</strong>
                    </div>
                </header>

                <div class="message-conversation-thread" id="messageConversationThread">
                    ${conversationHtml}
                </div>

                <form class="message-conversation-compose" id="messageConversationComposeForm">
                    <textarea
                        id="messageConversationBody"
                        rows="2"
                        maxlength="500"
                        placeholder="메시지를 입력하세요..."
                        aria-label="메시지 입력"
                        required
                    ></textarea>
                    <button
                        type="submit"
                        class="message-conversation-send"
                        aria-label="보내기"
                        title="보내기"
                    >
                        <i class="ti ti-send"></i>
                    </button>
                </form>
            </article>`;

        panel.querySelector("#messageConversationComposeForm")?.addEventListener(
            "submit",
            sendConversationMessage
        );

        panel.querySelectorAll("[data-message-edit]").forEach(button => {
            button.addEventListener("click", () => {
                const messageId = Number(button.dataset.messageEdit);
                const bubble = panel.querySelector(`[data-message-bubble-id="${messageId}"]`);
                startInlineMessageEdit(messageId, bubble);
            });
        });

        panel.querySelectorAll("[data-message-delete]").forEach(button => {
            button.addEventListener("click", () => {
                deleteOwnMessage(Number(button.dataset.messageDelete));
            });
        });

        const thread = panel.querySelector("#messageConversationThread");
        if (thread) {
            requestAnimationFrame(() => {
                thread.scrollTop = thread.scrollHeight;
            });
        }

        await updateMessageBadge();
        await renderMessageCenter();
        selectedMessageUserId = Number(userId);
    } catch (error) {
        panel.innerHTML = `<div class="message-empty-state"><p>${escapeGroupHtml(error.message)}</p></div>`;
    }
}

// mr.eum수정부분
// 대화방 하단 입력창에서 바로 답장을 보냅니다.
async function sendConversationMessage(event) {
    event.preventDefault();

    const bodyField = document.getElementById("messageConversationBody");
    const body = bodyField?.value.trim();

    if (!selectedMessageUserId || !body) return;

    const submit = event.currentTarget.querySelector('button[type="submit"]');

    if (submit) {
        submit.disabled = true;
    }

    try {
        await apiRequest(`/message/${selectedMessageUserId}/send`, {
            method: "POST",
            auth: true,
            body: {
                content: joinBackendMessageContent("쪽지", body)
            }
        });

        if (bodyField) {
            bodyField.value = "";
        }

        await openMessageConversation(
            selectedMessageUserId,
            selectedMessageNickname
        );

        await updateMessageBadge();
    } catch (error) {
        showToast(error.message);
    } finally {
        if (submit) {
            submit.disabled = false;
        }
    }
}

function getVisibleMessageParentModal() {
    return [...document.querySelectorAll(".modal-backdrop.show")]
        .find(modal => modal.id !== "messageComposeModal") || null;
}

function openMessageCompose(prefill = {}) {
    if (!getAuthToken()) {
        showToast("로그인이 필요합니다.");
        openModal(loginModal);
        return;
    }

    const modal = document.getElementById("messageComposeModal");
    const recipient = document.getElementById("messageRecipient");
    const subject = document.getElementById("messageSubject");
    const body = document.getElementById("messageBody");
    messageComposeReturnModal = getVisibleMessageParentModal();

    if (recipient) recipient.value = prefill.recipient || "";
    if (subject) subject.value = prefill.subject || "";
    if (body) body.value = prefill.body || "";

    openModal(modal);
    setTimeout(() => recipient?.focus(), 0);
}

function returnFromMessageCompose() {
    const target = messageComposeReturnModal;
    messageComposeReturnModal = null;
    if (target) {
        openModal(target);
        if (target.id === "groupMessageModal") renderMessageCenter();
    }
}

async function sendBackendMessage(event) {
    event.preventDefault();

    // mr.eum수정부분
    // 쪽지 제목 입력을 제거하고 받는 사람과 내용만 확인합니다.
    const recipient = document.getElementById("messageRecipient")?.value.trim();
    const body = document.getElementById("messageBody")?.value.trim();

    if (!recipient || !body) {
        showToast("받는 사람과 내용을 모두 입력해 주세요.");
        return;
    }

    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
        const recipientId = await apiRequest(`/message/${encodeURIComponent(recipient)}/find`);
        await apiRequest(`/message/${recipientId}/send`, {
            method: "POST",
            auth: true,
            body: { content: joinBackendMessageContent("쪽지", body) }
        });

        messageComposeReturnModal = null;
        closeModal(document.getElementById("messageComposeModal"));
        document.getElementById("messageComposeForm")?.reset();
        openModal(document.getElementById("groupMessageModal"));
        await renderMessageCenter();
        await updateMessageBadge();
        showToast(`${recipient}님에게 쪽지를 보냈습니다.`);
    } catch (error) {
        showToast(error.message);
    } finally {
        if (submit) submit.disabled = false;
    }
}

const headerMessageButton = document.getElementById("headerMessageButton");
const openMessageComposeButton = document.getElementById("openMessageComposeButton");
const messageComposeForm = document.getElementById("messageComposeForm");
const messageComposeModal = document.getElementById("messageComposeModal");

headerMessageButton?.addEventListener("click", () => openMessageCenter("inbox"));
openMessageComposeButton?.addEventListener("click", () => openMessageCompose());
messageComposeForm?.addEventListener("submit", sendBackendMessage);

document.querySelectorAll("[data-message-tab]").forEach(button => {
    button.addEventListener("click", () => {
        currentMessageTab = button.dataset.messageTab;
        selectedMessageUserId = null;
        renderMessageCenter();
    });
});

messageComposeModal?.querySelectorAll("[data-modal-close]").forEach(button => {
    button.addEventListener("click", () => setTimeout(returnFromMessageCompose, 0));
});

updateMessageBadge();
