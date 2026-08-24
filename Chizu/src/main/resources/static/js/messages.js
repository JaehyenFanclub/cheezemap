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
                        <span class="message-avatar">${escapeGroupHtml(nickname.slice(0, 1))}</span>
                        <span class="message-list-copy">
                            <strong>${escapeGroupHtml(nickname)}</strong>
                            <b>${escapeGroupHtml(parsed.subject)}</b>
                            <small>${formatMessageDate(chatter.lastMessage)}</small>
                        </span>
                    </button>`;
            }).join("")
            : `<div class="message-list-empty"><i class="ti ti-mail-off"></i><p>아직 대화한 상대가 없습니다.</p></div>`;

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

async function openMessageConversation(userId, nickname) {
    selectedMessageUserId = Number(userId);
    selectedMessageNickname = nickname || "상대방";

    const panel = document.getElementById("messageDetailPanel");
    if (!panel) return;
    panel.innerHTML = `<div class="message-empty-state"><p>대화를 불러오는 중...</p></div>`;

    try {
        const rows = await apiRequest(`/message/${selectedMessageUserId}/recept`, { auth: true });
        messageConversationCache = Array.isArray(rows) ? rows : [];

        panel.innerHTML = `
            <article class="message-detail">
                <header>
                    <div><span>대화 상대</span><strong>${escapeGroupHtml(selectedMessageNickname)}</strong></div>
                    <button type="button" class="primary-button" data-conversation-reply><i class="ti ti-pencil-plus"></i> 쪽지 보내기</button>
                </header>
                <div class="message-conversation-thread">
                    ${messageConversationCache.length ? messageConversationCache.map(item => {
                        const parsed = splitBackendMessageContent(item.content);
                        const mine = Boolean(item.whoSend);
                        const messageId = Number(item.messageId);
                        const actionText = getMessageActionText();
                        const canManage = mine && Number.isFinite(messageId);
                        return `
                            <div class="message-conversation-row ${mine ? "mine" : "theirs"}">
                                <div class="message-conversation-bubble" ${canManage ? `data-message-bubble-id="${messageId}"` : ""}>
                                    <strong>${escapeGroupHtml(parsed.subject)}</strong>
                                    <p>${escapeGroupHtml(parsed.body).replaceAll("\n", "<br>")}</p>
                                    <div class="message-bubble-footer">
                                        <small>${formatMessageDate(item.messageDate)}${item.isEdited ? (currentLanguage === "ja" ? " · 編集済み" : currentLanguage === "en" ? " · Edited" : " · 수정됨") : ""}</small>
                                        ${canManage ? `
                                            <span class="message-bubble-actions">
                                                <button type="button" class="message-mini-button" data-message-edit="${messageId}">${actionText.edit}</button>
                                                <button type="button" class="message-mini-button danger" data-message-delete="${messageId}">${actionText.delete}</button>
                                            </span>` : ""}
                                    </div>
                                </div>
                            </div>`;
                    }).join("") : `<div class="message-list-empty"><p>대화 내용이 없습니다.</p></div>`}
                </div>
            </article>`;

        panel.querySelector("[data-conversation-reply]")?.addEventListener("click", () => {
            openMessageCompose({ recipient: selectedMessageNickname });
        });

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

        await updateMessageBadge();
        await renderMessageCenter();
        selectedMessageUserId = Number(userId);
    } catch (error) {
        panel.innerHTML = `<div class="message-empty-state"><p>${escapeGroupHtml(error.message)}</p></div>`;
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

    const recipient = document.getElementById("messageRecipient")?.value.trim();
    const subject = document.getElementById("messageSubject")?.value.trim();
    const body = document.getElementById("messageBody")?.value.trim();

    if (!recipient || !subject || !body) {
        showToast("받는 사람, 제목, 내용을 모두 입력해 주세요.");
        return;
    }

    const submit = event.currentTarget.querySelector('button[type="submit"]');
    if (submit) submit.disabled = true;

    try {
        const recipientId = await apiRequest(`/message/${encodeURIComponent(recipient)}/find`);
        await apiRequest(`/message/${recipientId}/send`, {
            method: "POST",
            auth: true,
            body: { content: joinBackendMessageContent(subject, body) }
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
