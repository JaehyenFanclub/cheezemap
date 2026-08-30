const form =
    document.getElementById("signupPageForm");

const message =
    document.getElementById("signupPageMessage");


function setError(id, text = "") {
    const node =
        document.querySelector(
            `[data-error-for="${id}"]`
        );

    if (node) {
        node.textContent = text;
    }
}


function clearErrors() {
    document
        .querySelectorAll(".field-error")
        .forEach(node => {
            node.textContent = "";
        });

    if (message) {
        message.textContent = "";
        message.className = "form-message";
    }
}


function normalizePhone(phone) {
    return phone.replace(/[^0-9]/g, "");
}


async function signup(payload) {
    return apiRequest("/user/signup", {
        method: "POST",
        body: payload
    });
}


form?.addEventListener(
    "submit",
    async event => {
        event.preventDefault();

        clearErrors();


        const name =
            document
                .getElementById("userName")
                .value
                .trim();

        const nickname =
            document
                .getElementById("userNickname")
                .value
                .trim();

        const email =
            document
                .getElementById("email")
                .value
                .trim();

        const phone =
            normalizePhone(
                document
                    .getElementById("phone")
                    .value
                    .trim()
            );

        const password =
            document
                .getElementById("password")
                .value;

        const passwordConfirm =
            document
                .getElementById("passwordConfirm")
                .value;

        const birth =
            document
                .getElementById("birth")
                .value;

        const sex =
            document.querySelector(
                'input[name="sex"]:checked'
            )?.value || "";

        const termsAgree =
            document
                .getElementById("termsAgree")
                .checked;


        let hasError = false;


        if (!name) {
            setError(
                "userName",
                "이름을 입력해주세요."
            );

            hasError = true;
        }


        if (!nickname) {
            setError(
                "userNickname",
                "닉네임을 입력해주세요."
            );

            hasError = true;
        }


        if (!email) {
            setError(
                "email",
                "이메일을 입력해주세요."
            );

            hasError = true;
        }


        if (!phone) {
            setError(
                "phone",
                "전화번호를 입력해주세요."
            );

            hasError = true;
        }


        if (password.length < 6) {
            setError(
                "password",
                "비밀번호는 6자 이상이어야 합니다."
            );

            hasError = true;
        }


        if (
            password !==
            passwordConfirm
        ) {
            setError(
                "passwordConfirm",
                "비밀번호가 서로 다릅니다."
            );

            hasError = true;
        }


        if (!birth) {
            setError(
                "birth",
                "생년월일을 입력해주세요."
            );

            hasError = true;
        }


        if (!sex) {
            setError(
                "sex",
                "성별을 선택해주세요."
            );

            hasError = true;
        }


        if (!termsAgree) {
            setError(
                "termsAgree",
                "필수 동의 항목을 확인해주세요."
            );

            hasError = true;
        }


        if (hasError) {
            return;
        }


        const payload = {
            userName: name,

            userNickname:
                nickname,

            password,

            email,

            phone,

            birth,

            SEX:
                sex === "male",

            isAdmin:
                false
        };


        const submitButton =
            form.querySelector(
                'button[type="submit"]'
            );


        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent =
                    "회원가입 중...";
            }


            const result =
                await signup(payload);


            if (message) {
                message.className =
                    "form-message success";

                message.textContent =
                    result?.msg ||
                    "회원가입이 완료되었습니다.";
            }


            setTimeout(() => {
                window.location.href = "/";
            }, 800);

        } catch (error) {
            console.error(
                "회원가입 실패:",
                error
            );


            if (message) {
                message.className =
                    "form-message error";

                message.textContent =
                    error.message;
            }

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent =
                    "회원가입";
            }
        }
    }
);