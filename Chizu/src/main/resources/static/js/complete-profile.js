"use strict";

const LANGUAGE_KEY = "cheeseMapLanguage";

const messages = {
    ko: {
        title: "추가 정보 입력",
        description: "맞춤 장소 추천을 위해 필요한 정보를 확인해주세요.",
        name: "이름",
        email: "이메일",
        nickname: "닉네임",
        phone: "전화번호",
        birth: "생년월일",
        gender: "성별",
        male: "남성",
        female: "여성",
        notice: "이미 소셜 계정에서 받은 정보는 자동으로 입력됩니다. 비밀번호는 소셜 서비스에서 관리됩니다.",
        submit: "가입 완료",
        required: "닉네임, 전화번호, 생년월일, 성별을 모두 입력해주세요.",
        success: "추가 정보 저장이 완료되었습니다."
    },
    ja: {
        title: "追加情報の入力",
        description: "おすすめ場所のパーソナライズに必要な情報を確認してください。",
        name: "名前",
        email: "メールアドレス",
        nickname: "ニックネーム",
        phone: "電話番号",
        birth: "生年月日",
        gender: "性別",
        male: "男性",
        female: "女性",
        notice: "SNSから取得できた情報は自動入力されます。パスワードは各SNSサービスで管理されます。",
        submit: "登録を完了",
        required: "ニックネーム、電話番号、生年月日、性別をすべて入力してください。",
        success: "追加情報を保存しました。"
    },
    en: {
        title: "Complete your profile",
        description: "Please confirm the information needed for personalized place recommendations.",
        name: "Name",
        email: "Email",
        nickname: "Nickname",
        phone: "Phone",
        birth: "Date of birth",
        gender: "Gender",
        male: "Male",
        female: "Female",
        notice: "Information provided by your social account is filled automatically. Your password is managed by the social provider.",
        submit: "Complete sign-up",
        required: "Please enter nickname, phone, date of birth, and gender.",
        success: "Your profile has been completed."
    }
};

let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || "ko";
if (!messages[currentLanguage]) currentLanguage = "ko";

function t(key) {
    return messages[currentLanguage]?.[key] || messages.ko[key] || key;
}

function applyLanguage(language) {
    currentLanguage = messages[language] ? language : "ko";
    localStorage.setItem(LANGUAGE_KEY, currentLanguage);
    document.documentElement.lang = currentLanguage;

    document.querySelectorAll("[data-i18n]").forEach(node => {
        node.textContent = t(node.dataset.i18n);
    });

    document.querySelectorAll("[data-language]").forEach(button => {
        button.classList.toggle("active", button.dataset.language === currentLanguage);
    });
}

function normalizePhone(value) {
    const numbers = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (numbers.length < 4) return numbers;
    if (numbers.length < 8) return `${numbers.slice(0,3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0,3)}-${numbers.slice(3,7)}-${numbers.slice(7)}`;
}

function setMessage(text, success = false) {
    const node = document.getElementById("completeProfileMessage");
    if (!node) return;
    node.textContent = text || "";
    node.className = success ? "form-message success" : "form-message";
}

async function loadSocialProfile() {
    if (!getAuthToken()) {
        window.location.replace("index.html?login=1");
        return;
    }

    try {
        const data = await apiRequest("/user/mypage", { auth: true });
        const user = mapMyPageUser(data);

        const provider = String(user?.provider || "LOCAL").toUpperCase();
        if (provider === "LOCAL") {
            window.location.replace("index.html");
            return;
        }

        document.getElementById("providerBadge").textContent = provider;
        document.getElementById("socialName").value = user?.name || "";
        document.getElementById("socialEmail").value = user?.email || "";
        document.getElementById("socialNickname").value = user?.nickname || "";
        document.getElementById("socialPhone").value = normalizePhone(user?.phone || "");
        document.getElementById("socialBirth").value = user?.birth || "";

        if (user?.sex === true || user?.sex === false) {
            const radio = document.querySelector(`input[name="sex"][value="${String(user.sex)}"]`);
            if (radio) radio.checked = true;
        }

        localStorage.setItem("cheeseMapUser", JSON.stringify(user));
    } catch (error) {
        clearAuthToken();
        localStorage.removeItem("cheeseMapUser");
        window.location.replace("index.html?login=1");
    }
}

document.getElementById("socialPhone")?.addEventListener("input", event => {
    event.target.value = normalizePhone(event.target.value);
});

document.querySelectorAll("[data-language]").forEach(button => {
    button.addEventListener("click", () => applyLanguage(button.dataset.language));
});

document.getElementById("completeProfileForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    setMessage("");

    const userName = document.getElementById("socialName").value.trim();
    const userNickname = document.getElementById("socialNickname").value.trim();
    const userPhone = document.getElementById("socialPhone").value.replace(/\D/g, "");
    const birth = document.getElementById("socialBirth").value;
    const sex = document.querySelector('input[name="sex"]:checked')?.value;

    if (!userNickname || !userPhone || !birth || sex == null) {
        setMessage(t("required"));
        return;
    }

    const formData = new FormData();
    formData.append("userName", userName || "소셜 사용자");
    formData.append("userNickname", userNickname);
    formData.append("userPhone", userPhone);
    formData.append("birth", birth);
    formData.append("sex", sex);

    try {
        const button = document.querySelector(".submit-button");
        if (button) button.disabled = true;

        await apiRequest("/user/mypage/edit", {
            method: "PUT",
            auth: true,
            body: formData
        });

        const latestData = await apiRequest("/user/mypage", { auth: true });
        const latestUser = mapMyPageUser(latestData);
        localStorage.setItem("cheeseMapUser", JSON.stringify(latestUser));

        setMessage(t("success"), true);
        setTimeout(() => window.location.replace("index.html"), 500);
    } catch (error) {
        setMessage(error.message);
    } finally {
        const button = document.querySelector(".submit-button");
        if (button) button.disabled = false;
    }
});

applyLanguage(currentLanguage);
loadSocialProfile();
