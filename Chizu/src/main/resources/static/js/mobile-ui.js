/*
=====================================================
CHEESE MAP - MOBILE ONLY
PC에서는 아무 동작도 하지 않습니다.
=====================================================
*/

(function () {
    const mobileQuery =
        window.matchMedia(
            "(max-width: 768px)"
        );

    if (!mobileQuery.matches) {
        return;
    }

    let recommendationInitialized =
        false;

    function collapseRecommendationOnce() {
        if (recommendationInitialized) {
            return;
        }

        const panel =
            document.getElementById(
                "recommendPanel"
            );

        const button =
            document.getElementById(
                "hideRecommendButton"
            );

        if (!panel) {
            return;
        }

        /*
            map.js가 추천 패널 초기화를 끝낸 뒤
            모바일에서만 첫 화면을 접힌 bottom sheet로 시작.
            이후 사용자가 직접 펼치거나 접는 동작은 기존 map.js에 맡김.
        */
        if (
            panel.dataset
                .recommendInitialized ===
            "true"
        ) {
            panel.classList.add(
                "collapsed"
            );

            if (button) {
                button.textContent =
                    "+";

                button.setAttribute(
                    "aria-expanded",
                    "false"
                );
            }

            recommendationInitialized =
                true;
        }
    }

    document.addEventListener(
        "DOMContentLoaded",
        () => {
            collapseRecommendationOnce();

            const panel =
                document.getElementById(
                    "recommendPanel"
                );

            if (!panel) {
                return;
            }

            const observer =
                new MutationObserver(
                    collapseRecommendationOnce
                );

            observer.observe(
                panel,
                {
                    attributes: true,
                    attributeFilter: [
                        "data-recommend-initialized"
                    ]
                }
            );

            window.setTimeout(
                collapseRecommendationOnce,
                500
            );

            window.setTimeout(
                collapseRecommendationOnce,
                1500
            );
        }
    );
})();
