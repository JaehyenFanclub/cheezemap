const profileEditForm = document.getElementById("profileEditForm");
const profileEditMessage = document.getElementById("profileEditMessage");

function setProfileMessage(text, success = false) {
    if (!profileEditMessage) return;
    profileEditMessage.className = success ? "form-message success" : "form-message";
    profileEditMessage.textContent = text || "";
}

async function loadProfileForEdit() {
    try {
        const data = await apiRequest("/user/mypage", { auth: true });
        const user = mapMyPageUser(data);
        document.getElementById("editName").value = user.name || "";
        document.getElementById("editNickname").value = user.nickname || "";
        document.getElementById("editEmail").value = user.email || "";
        document.getElementById("editPhone").value = user.phone || "";
        document.getElementById("editBirth").value = user.birth || "";

        const email = document.getElementById("editEmail");
        const birth = document.getElementById("editBirth");
        if (email) email.readOnly = true;
        if (birth) birth.readOnly = true;
    } catch (error) {
        setProfileMessage(error.message);
        setTimeout(() => window.location.href = "index.html", 1000);
    }
}

profileEditForm?.addEventListener("submit", async event => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("userName", document.getElementById("editName").value.trim());
    formData.append("userNickname", document.getElementById("editNickname").value.trim());
    formData.append("userPhone", document.getElementById("editPhone").value.trim());

    const currentPassword = document.getElementById("currentPassword")?.value || "";
    const newPassword = document.getElementById("newPassword")?.value || "";
    const confirmPassword = document.getElementById("newPasswordConfirm")?.value || "";
    if (newPassword) {
        if (newPassword.length < 6) return setProfileMessage("새 비밀번호는 6자 이상이어야 합니다.");
        if (newPassword !== confirmPassword) return setProfileMessage("새 비밀번호가 서로 다릅니다.");
        formData.append("currentPassword", currentPassword);
        formData.append("newPassword", newPassword);
    }

    const photoInput = document.getElementById("editPhoto");
    if (photoInput?.files?.[0]) formData.append("photo", photoInput.files[0]);

    try {
        const result = await apiRequest("/user/mypage/edit", {
            method: "PUT",
            auth: true,
            body: formData
        });
        const data = await apiRequest("/user/mypage", { auth: true });
        localStorage.setItem("cheeseMapUser", JSON.stringify(mapMyPageUser(data)));
        setProfileMessage(result?.msg || "프로필이 수정되었습니다.", true);
        setTimeout(() => { window.location.href = "index.html"; }, 700);
    } catch (error) {
        setProfileMessage(error.message);
    }
});

loadProfileForEdit();
