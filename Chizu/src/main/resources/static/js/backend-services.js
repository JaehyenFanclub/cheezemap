/* =====================================================
   CHEESE MAP 백엔드 전체 API 래퍼
   UI가 있는 기능은 각 화면에서 이 API/공통 apiRequest를 사용하고,
   관리 UI가 아직 없는 Place/Menu/Photo CRUD도 여기서 호출 가능.
===================================================== */

window.CheeseApi = {
    user: {
        signup: body => apiRequest("/user/signup", { method: "POST", body }),
        login: body => apiRequest("/user/auth/login", { method: "POST", body }),
        logout: () => apiRequest("/user/auth/logout", { method: "POST", auth: true }),
        mypage: () => apiRequest("/user/mypage", { auth: true }),
        edit: formData => apiRequest("/user/mypage/edit", { method: "PUT", auth: true, body: formData }),
        delete: () => apiRequest("/user/delete", { method: "DELETE", auth: true })
    },

    place: {
        resolve: body => apiRequest("/place", { method: "POST", auth: true, body }),
        create: body => apiRequest("/place", { method: "POST", auth: true, body }),
        get: placeId => apiRequest(`/place/${placeId}`),
        update: (placeId, body) => apiRequest(`/place/${placeId}`, { method: "PUT", auth: true, body }),
        delete: placeId => apiRequest(`/place/${placeId}`, { method: "DELETE", auth: true }),
        photo: {
            create: (placeId, file) => { const form = new FormData(); form.append("file", file); return apiRequest(`/place/${placeId}/photo`, { method: "POST", auth: true, body: form }); },
            get: (placeId, photoId) => apiRequest(`/place/${placeId}/photo/${photoId}`),
            delete: (placeId, photoId) => apiRequest(`/place/${placeId}/photo/${photoId}`, { method: "DELETE", auth: true })
        }
    },

    menu: {
        list: placeId => apiRequest(`/place/${placeId}/menu`),
        create: (placeId, body) => apiRequest(`/place/${placeId}/menu`, { method: "POST", auth: true, body }),
        get: (placeId, menuId) => apiRequest(`/place/${placeId}/menu/${menuId}`),
        update: (placeId, menuId, body) => apiRequest(`/place/${placeId}/menu/${menuId}`, { method: "PUT", auth: true, body }),
        delete: (placeId, menuId) => apiRequest(`/place/${placeId}/menu/${menuId}`, { method: "DELETE", auth: true }),
        photo: {
            create: (placeId, menuId, file) => { const form = new FormData(); form.append("file", file); return apiRequest(`/place/${placeId}/menu/${menuId}/photo`, { method: "POST", auth: true, body: form }); },
            get: (placeId, menuId, photoId) => apiRequest(`/place/${placeId}/menu/${menuId}/photo/${photoId}`),
            delete: (placeId, menuId, photoId) => apiRequest(`/place/${placeId}/menu/${menuId}/photo/${photoId}`, { method: "DELETE", auth: true })
        }
    },

    review: {
        list: placeId => apiRequest(`/place/${placeId}/review`),
        create: (placeId, formData) => apiRequest(`/place/${placeId}/review`, { method: "POST", auth: true, body: formData }),
        update: (placeId, reviewId, formData) => apiRequest(`/place/${placeId}/review/${reviewId}/edit`, { method: "PUT", auth: true, body: formData }),
        delete: (placeId, reviewId) => apiRequest(`/place/${placeId}/review/${reviewId}/delete`, { method: "DELETE", auth: true }),
        like: (placeId, reviewId) => apiRequest(`/place/${placeId}/review/${reviewId}/like`, { method: "POST", auth: true }),
        my: async () => {
            const ids = typeof getKnownBackendPlaceIds === "function" ? getKnownBackendPlaceIds() : [];
            const groups = await Promise.all(ids.map(async placeId => {
                try {
                    const rows = await apiRequest(`/place/${placeId}/review`);
                    return (Array.isArray(rows) ? rows : []).filter(review => Number(review.userId) === Number(currentUser?.id));
                } catch { return []; }
            }));
            return groups.flat();
        }
    },

    group: {
        my: () => apiRequest("/group/my", { auth: true }),
        create: body => apiRequest("/group/create", { method: "POST", auth: true, body }),
        get: groupId => apiRequest(`/group/${groupId}`, { auth: true }),
        share: groupId => apiRequest(`/group/${groupId}/share`, { auth: true }),
        clone: (groupId, body) => apiRequest(`/group/${groupId}/clone`, { method: "POST", auth: true, body }),
        update: (groupId, body) => apiRequest(`/group/${groupId}/update`, { method: "PUT", auth: true, body }),
        delete: groupId => apiRequest(`/group/${groupId}/delete`, { method: "DELETE", auth: true }),
        addPlace: (groupId, placeId) => apiRequest(`/group/${groupId}/addPlace`, { method: "POST", auth: true, body: { groupId: Number(groupId), placeId: Number(placeId) } }),
        deletePlace: (groupId, placeId) => apiRequest(`/group/${groupId}/deletePlace`, { method: "DELETE", auth: true, body: { groupId: Number(groupId), placeId: Number(placeId) } })
    }
};
