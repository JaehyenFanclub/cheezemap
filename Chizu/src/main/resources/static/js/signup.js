"use strict";

const SIGNUP_LANGUAGE_KEY = "cheeseMapLanguage";

const signupTranslations = {
    ko: {
        visualTitle: "도쿄의 좋은 장소를<br>나만의 지도에 담아보세요.",
        visualDescription: "좋아요한 장소와 리뷰를 저장하고, 나중에 다시 편하게 찾아볼 수 있어요.",
        signupTitle: "회원가입",
        signupDescription: "치즈맵에서 사용할 정보를 입력해주세요.",
        name: "이름", nickname: "닉네임", email: "이메일", password: "비밀번호",
        passwordConfirm: "비밀번호 확인", phone: "전화번호", birth: "생년월일", gender: "성별",
        male: "남성", female: "여성", required: "필수",
        termsAgreement: "이용약관과 개인정보 처리방침에 동의합니다.",
        signupButton: "회원가입", alreadyAccount: "이미 계정이 있나요?", login: "로그인",
        backHome: "치즈맵으로 돌아가기", namePlaceholder: "이름을 입력하세요",
        nicknamePlaceholder: "닉네임을 입력하세요", passwordPlaceholder: "6자 이상 입력하세요",
        passwordConfirmPlaceholder: "비밀번호를 다시 입력하세요", passwordToggleAria: "비밀번호 표시 전환",
        mainAria: "메인으로 돌아가기",
        errorName: "이름을 입력해주세요.", errorNickname: "닉네임을 입력해주세요.",
        errorEmail: "올바른 이메일 형식으로 입력해주세요.", errorPassword: "비밀번호는 6자 이상 입력해주세요.",
        errorPasswordConfirm: "비밀번호가 서로 일치하지 않습니다.", errorPhone: "전화번호를 정확하게 입력해주세요.",
        errorBirth: "생년월일을 선택해주세요.", errorGender: "성별을 선택해주세요.",
        errorTerms: "필수 약관에 동의해주세요.", errorForm: "입력한 정보를 다시 확인해주세요.",
        success: "회원가입이 완료되었습니다. 로그인 화면으로 이동합니다.",
        signupFailed: "회원가입에 실패했습니다."
    },
    ja: {
        visualTitle: "東京の素敵な場所を<br>自分だけの地図に保存しましょう。",
        visualDescription: "いいねした場所やレビューを保存し、あとで簡単に見つけられます。",
        signupTitle: "会員登録", signupDescription: "CHEESE MAPで使用する情報を入力してください。",
        name: "名前", nickname: "ニックネーム", email: "メールアドレス", password: "パスワード",
        passwordConfirm: "パスワード確認", phone: "電話番号", birth: "生年月日", gender: "性別",
        male: "男性", female: "女性", required: "必須",
        termsAgreement: "利用規約とプライバシーポリシーに同意します。",
        signupButton: "会員登録", alreadyAccount: "すでにアカウントをお持ちですか？", login: "ログイン",
        backHome: "CHEESE MAPに戻る", namePlaceholder: "名前を入力してください",
        nicknamePlaceholder: "ニックネームを入力してください", passwordPlaceholder: "6文字以上入力してください",
        passwordConfirmPlaceholder: "パスワードをもう一度入力してください", passwordToggleAria: "パスワード表示切替",
        mainAria: "メインに戻る",
        errorName: "名前を入力してください。", errorNickname: "ニックネームを入力してください。",
        errorEmail: "正しいメールアドレスを入力してください。", errorPassword: "パスワードは6文字以上で入力してください。",
        errorPasswordConfirm: "パスワードが一致しません。", errorPhone: "電話番号を正しく入力してください。",
        errorBirth: "生年月日を選択してください。", errorGender: "性別を選択してください。",
        errorTerms: "必須項目に同意してください。", errorForm: "入力内容をもう一度確認してください。",
        success: "会員登録が完了しました。ログイン画面に移動します。", signupFailed: "会員登録に失敗しました。"
    },
    en: {
        visualTitle: "Save great places in Tokyo<br>to your own map.",
        visualDescription: "Save liked places and reviews so you can easily find them later.",
        signupTitle: "Create account", signupDescription: "Enter the information you want to use on CHEESE MAP.",
        name: "Name", nickname: "Nickname", email: "Email", password: "Password",
        passwordConfirm: "Confirm password", phone: "Phone", birth: "Date of birth", gender: "Gender",
        male: "Male", female: "Female", required: "Required",
        termsAgreement: "I agree to the Terms of Use and Privacy Policy.",
        signupButton: "Create account", alreadyAccount: "Already have an account?", login: "Log in",
        backHome: "Back to CHEESE MAP", namePlaceholder: "Enter your name",
        nicknamePlaceholder: "Enter your nickname", passwordPlaceholder: "Enter at least 6 characters",
        passwordConfirmPlaceholder: "Enter your password again", passwordToggleAria: "Toggle password visibility",
        mainAria: "Back to home",
        errorName: "Please enter your name.", errorNickname: "Please enter your nickname.",
        errorEmail: "Please enter a valid email address.", errorPassword: "Password must be at least 6 characters.",
        errorPasswordConfirm: "Passwords do not match.", errorPhone: "Please enter a valid phone number.",
        errorBirth: "Please select your date of birth.", errorGender: "Please select your gender.",
        errorTerms: "Please agree to the required terms.", errorForm: "Please check the information you entered.",
        success: "Your account has been created. Opening the login screen.", signupFailed: "Sign-up failed."
    }
};

let currentSignupLanguage = localStorage.getItem(SIGNUP_LANGUAGE_KEY) || "ko";
if (!signupTranslations[currentSignupLanguage]) currentSignupLanguage = "ko";

const form = document.getElementById("signupForm");
const formMessage = document.getElementById("formMessage");

function st(key) {
    return signupTranslations[currentSignupLanguage]?.[key] || signupTranslations.ko[key] || key;
}

function applySignupLanguage(language) {
    currentSignupLanguage = signupTranslations[language] ? language : "ko";
    localStorage.setItem(SIGNUP_LANGUAGE_KEY, currentSignupLanguage);
    document.documentElement.lang = currentSignupLanguage;

    document.querySelectorAll("[data-i18n]").forEach(el => {
        el.textContent = st(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        el.innerHTML = st(el.dataset.i18nHtml);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = st(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll(".language-option").forEach(button => {
        const active = button.dataset.language === currentSignupLanguage;
        button.classList.toggle("is-active", active);
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    document.getElementById("brandHomeLink")?.setAttribute("aria-label", st("mainAria"));
    document.querySelectorAll("[data-toggle-password]").forEach(button => {
        button.setAttribute("aria-label", st("passwordToggleAria"));
    });
    clearErrors();
}

function setError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.querySelector(`[data-error-for="${inputId}"]`);
    input?.closest(".input-wrap")?.classList.toggle("is-error", Boolean(message));
    if (error) error.textContent = message;
}

function clearErrors() {
    document.querySelectorAll(".field-error").forEach(el => el.textContent = "");
    document.querySelectorAll(".input-wrap.is-error").forEach(el => el.classList.remove("is-error"));
    document.querySelector(".sex-field")?.classList.remove("is-error");
    if (formMessage) {
        formMessage.textContent = "";
        formMessage.className = "form-message";
    }
}

function formatPhoneNumber(value) {
    const numbers = String(value || "").replace(/\D/g, "").slice(0, 11);
    if (numbers.length < 4) return numbers;
    if (numbers.length < 8) return `${numbers.slice(0,3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0,3)}-${numbers.slice(3,7)}-${numbers.slice(7)}`;
}

document.getElementById("phone")?.addEventListener("input", event => {
    event.target.value = formatPhoneNumber(event.target.value);
});

document.querySelectorAll("[data-toggle-password]").forEach(button => {
    button.addEventListener("click", () => {
        const input = document.getElementById(button.dataset.togglePassword);
        if (!input) return;
        const hidden = input.type === "password";
        input.type = hidden ? "text" : "password";
        button.innerHTML = `<i class="ti ${hidden ? "ti-eye-off" : "ti-eye"}"></i>`;
    });
});

document.querySelectorAll(".language-option").forEach(button => {
    button.addEventListener("click", () => applySignupLanguage(button.dataset.language));
});

document.getElementById("signupLoginLink")?.addEventListener("click", event => {
    event.preventDefault();
    sessionStorage.setItem("cheeseMapOpenLogin", "1");
    window.location.href = "/?login=1";
});

form?.addEventListener("submit", async event => {
    event.preventDefault();
    clearErrors();

    const userName = document.getElementById("userName").value.trim();
    const userNickname = document.getElementById("userNickname").value.trim();
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("passwordConfirm").value;
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.replace(/\D/g, "");
    const birth = document.getElementById("birth").value;
    const sexValue = document.querySelector('input[name="SEX"]:checked')?.value;
    const agreeTerms = document.getElementById("agreeTerms").checked;

    let valid = true;
    if (!userName) { setError("userName", st("errorName")); valid = false; }
    if (!userNickname) { setError("userNickname", st("errorNickname")); valid = false; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("email", st("errorEmail")); valid = false; }
    if (password.length < 6) { setError("password", st("errorPassword")); valid = false; }
    if (password !== passwordConfirm) { setError("passwordConfirm", st("errorPasswordConfirm")); valid = false; }
    if (phone.length < 10) { setError("phone", st("errorPhone")); valid = false; }
    if (!birth) { setError("birth", st("errorBirth")); valid = false; }
    if (sexValue !== "true" && sexValue !== "false") {
        const sexError = document.querySelector('[data-error-for="SEX"]');
        if (sexError) sexError.textContent = st("errorGender");
        document.querySelector(".sex-field")?.classList.add("is-error");
        valid = false;
    }
    if (!agreeTerms) {
        const termsError = document.querySelector('[data-error-for="agreeTerms"]');
        if (termsError) termsError.textContent = st("errorTerms");
        valid = false;
    }

    if (!valid) {
        if (formMessage) {
            formMessage.textContent = st("errorForm");
            formMessage.className = "form-message error";
        }
        document.querySelector(".input-wrap.is-error input")?.focus();
        return;
    }

    const submitButton = form.querySelector('.signup-submit');
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch("/user/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userName,
                userNickname,
                password,
                email,
                phone,
                birth,
                SEX: sexValue === "true",
                isAdmin: false
            })
        });

        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await response.json().catch(() => null)
            : await response.text().catch(() => "");

        if (!response.ok) {
            const message = data?.msg || data?.message || data?.error || (typeof data === "string" ? data : "") || st("signupFailed");
            throw new Error(message);
        }

        if (formMessage) {
            formMessage.textContent = st("success");
            formMessage.className = "form-message success";
        }

        sessionStorage.setItem("cheeseMapOpenLogin", "1");
        setTimeout(() => {
            window.location.href = "/?login=1";
        }, 600);
    } catch (error) {
        if (formMessage) {
            formMessage.textContent = error.message || st("signupFailed");
            formMessage.className = "form-message error";
        }
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

applySignupLanguage(currentSignupLanguage);
