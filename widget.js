(function () {
    let originalFeedbackchimp = window.Feedbackchimp;
    let wrapperDiv;
    let embedDiv;
    let iframe;
    let triggerButton;
    let updateBadge;
    let manualPopupDiv;
    let manualPopupIframe;
    let isInitialized = false;
    let isFeedbackInitialized = false;
    let isEmbedInitialized = false;
    let feedbackWrapperDiv;
    let feedbackIframe;
    let initConfig;
    let feedbackConfig;
    let embedConfig;
    let unviewedChangelogCount;
    let isRecentlyOpened = false;
    const openCooldownPeriod = 300; // 0.3 sec
    let iframeOrigin = "https://widget.feedbackchimp.com";

    function openFeedbackWidget() {
        if (feedbackWrapperDiv) {
            feedbackWrapperDiv.style.display = 'block';
            isRecentlyOpened = true;
            setTimeout(() => {
                isRecentlyOpened = false;
            }, openCooldownPeriod);
        }
    }

    function closeFeedbackWidget() {
        if (feedbackWrapperDiv && !isRecentlyOpened) {
            feedbackWrapperDiv.style.display = 'none';
        }
    }

    function removeExtraSlashesFromUrl(url) {
        return url.replace(/([^:]\/)\/+/g, "$1").replace(/\/+$/, "");
    }


    function handleUrlChange(isPop = false) {
        if (!isEmbedInitialized) return;

        const currentPath = window.location.pathname;
        if (currentPath.startsWith(embedConfig.basePath)) {
            const subPath = currentPath.slice(embedConfig.basePath.length);
            const embedIframe = document.querySelector('iframe');
            if (embedIframe) {
                let isBlank = false;
                try {
                    isBlank = embedIframe.contentWindow.location.href === 'about:blank';
                } catch {

                }
                // Reload iframe if it's blank or update the iframe's route
                if (isBlank) {
                    let iframeUrl = `https://${embedConfig.organization}.feedbackchimp.space/${subPath}`;
                    iframeUrl = removeExtraSlashesFromUrl(iframeUrl)
                    const queryParams = new URLSearchParams(embedConfig).toString();
                    embedIframe.src = `${iframeUrl}?${queryParams}`;
                } else {
                    embedIframe.contentWindow.postMessage({
                        type: 'externalRouteChange',
                        path: subPath,
                        pop: isPop,
                    }, `https://${embedConfig.organization}.feedbackchimp.space`);
                }
            }
        }
    }

    function openChangelogPopup(slug = null) {
        if (!manualPopupDiv) {
            createManualPopup();
        }

        const queryParams = new URLSearchParams(initConfig).toString();
        let iframeSrc = `${iframeOrigin}/changelog/popup`;

        if (slug) {
            iframeSrc += '/' + encodeURIComponent(slug);
        }

        manualPopupIframe.src = iframeSrc + '?' + queryParams;

        // Show manual popup
        manualPopupDiv.style.display = 'flex';

        // Update iframe src with the new slug if provided
        // if (slug) {
        //     const currentSrc = new URL(manualPopupIframe.src);
        //     currentSrc.searchParams.set('slug', slug);
        //     manualPopupIframe.src = currentSrc.toString();
        // }
    }

    window.Feedbackchimp = function (action, config) {
        if (action === "initialize_changelog_widget") {
            isInitialized = true;
            initConfig = config;
            // Create style element for keyframes
            var style = document.createElement('style');
            style.textContent = `
                @keyframes slideDown {
                    0% {
                        max-height: 100px;
                        opacity: 0.4;
                    }
                    100% {
                        max-height: 350px;
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);

            // Find the trigger button
            triggerButton = document.querySelector('[data-feeadbackchimp-changelog]');
            if (!triggerButton) {
                console.error('Trigger button not found');
                return;
            }

            updateBadge = triggerButton.querySelector('#fc-update-badge');

            // Create the wrapper div
            wrapperDiv = document.createElement('div');
            wrapperDiv.style.cssText = `
                background: rgb(255, 255, 255);
                filter: drop-shadow(rgba(0, 0, 0, 0.1) 0px 20px 13px);
                height: 350px;
                max-height: 350px;
                border-radius: 8px;
                overflow: hidden;
                position: fixed;
                transition: height .24s ease, max-height .24s ease, opacity .2s ease;
                width: 340px;
                will-change: height, margin-top, opacity, box-shadow;
                animation: slideDown .3s ease;
                z-index: 2147483647;
                display: none;
            `;

            // Create the iframe
            iframe = document.createElement('iframe');
            iframe.style.cssText = `
                border: none;
                height: 100%;
                overflow: hidden;
                position: relative;
                width: 100%;
                z-index: 2147483647;
                background: rgb(255, 255, 255);
            `;

            // Construct the query string from the config object
            const queryParams = Object.keys(config).map(function (key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(config[key]);
            }).join('&');

            // Set the iframe src with the query parameters
            iframe.src = `${iframeOrigin}/changelog/mini?` + queryParams;

            // Append iframe to wrapper div
            wrapperDiv.appendChild(iframe);

            // Function to determine the best placement
            function updatePlacement() {
                const buttonRect = triggerButton.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                let left, top;
                const placement = config.placement || 'bottom';

                function tryPlacement(attemptedPlacement) {
                    switch (attemptedPlacement) {
                        case 'right':
                            if (buttonRect.right + wrapperDiv.offsetWidth + 8 <= windowWidth) {
                                left = buttonRect.right + 8;
                                top = buttonRect.top;
                                return true;
                            }
                            break;
                        case 'left':
                            if (buttonRect.left - wrapperDiv.offsetWidth - 8 >= 0) {
                                left = buttonRect.left - wrapperDiv.offsetWidth - 8;
                                top = buttonRect.top;
                                return true;
                            }
                            break;
                        case 'top':
                            if (buttonRect.top - wrapperDiv.offsetHeight - 8 >= 0) {
                                // Center align horizontally
                                left = buttonRect.left + (buttonRect.width / 2) - (wrapperDiv.offsetWidth / 2);
                                top = buttonRect.top - wrapperDiv.offsetHeight - 8;
                                return true;
                            }
                            break;
                        case 'bottom':
                            if (buttonRect.bottom + wrapperDiv.offsetHeight + 8 <= windowHeight) {
                                // Center align horizontally
                                left = buttonRect.left + (buttonRect.width / 2) - (wrapperDiv.offsetWidth / 2);
                                top = buttonRect.bottom + 8;
                                return true;
                            }
                            break;
                    }
                    return false;
                }

                // Try the specified placement first
                if (!tryPlacement(placement)) {
                    // If the specified placement doesn't work, try others in this order
                    const fallbackOrder = ['bottom', 'right', 'left', 'top'];
                    for (const i = 0; i < fallbackOrder.length; i++) {
                        if (tryPlacement(fallbackOrder[i])) {
                            break;
                        }
                    }
                }

                // Final adjustments to ensure it's on screen
                left = Math.max(8, Math.min(left, windowWidth - wrapperDiv.offsetWidth - 8));
                top = Math.max(8, Math.min(top, windowHeight - wrapperDiv.offsetHeight - 8));

                wrapperDiv.style.left = `${left}px`;
                wrapperDiv.style.top = `${top}px`;
            }

            // Append the wrapper div to the body
            document.body.appendChild(wrapperDiv);

            // Function to toggle the widget
            function toggleWidget() {
                if (wrapperDiv.style.display === 'none') {
                    wrapperDiv.style.display = 'block';
                    updatePlacement();
                    // Reset animation
                    wrapperDiv.style.animation = 'none';
                    wrapperDiv.offsetHeight; // Trigger reflow
                    wrapperDiv.style.animation = 'slideDown 0.3s ease forwards';
                } else {
                    wrapperDiv.style.display = 'none';
                }
            }

            // Add click event to the trigger button
            triggerButton.addEventListener('click', function (e) {
                e.stopPropagation();
                toggleWidget();
            });

            // Close widget when clicking outside
            document.addEventListener('click', function (e) {
                if (wrapperDiv.style.display !== 'none' && !wrapperDiv.contains(e.target) && e.target !== triggerButton) {
                    wrapperDiv.style.display = 'none';
                }
            });

            // Update placement on window resize
            window.addEventListener('resize', updatePlacement);

            // Listen for messages from the iframe
            window.addEventListener('message', function (event) {
                if (event.origin === iframeOrigin && event.data === 'closeChangelog') {
                    wrapperDiv.style.display = 'none';
                } else if (event.data && event.data.action === 'updateUnviewedChangelogCount') {
                    unviewedChangelogCount = event.data.content
                    updateBadgeContent(event.data.content);
                } else if (event.data && event.data.action === 'openChangelogPopup') {
                    const changelogSlug = event.data.content
                    openChangelogPopup(changelogSlug)
                }
            }, false);

        } else if (action === "open_changelog_popup") {
            if (!isInitialized) {
                console.error('Feedbackchimp: initialize_changelog_widget must be called first');
                return;
            }

            openChangelogPopup(config.slug)
        } else if (action === "initialize_feedback_widget") {
            isFeedbackInitialized = true;
            feedbackConfig = config;
            initializeFeedbackWidget(config);

        } else if (action === "open_feedback_widget") {
            if (!isFeedbackInitialized) {
                console.error('Feedbackchimp: initialize_feedback_widget must be called first');
                return;
            }
            openFeedbackWidget();
        } else if (action === "unviewed_changelog_count") {
            return unviewedChangelogCount;
        } else if (action === "embed") {
            if (!config.basePath) {
                config.basePath = "";
            }
            embedConfig = config;
            createEmbedDiv();
            isEmbedInitialized = true;

            // Initialize embed
            const embedIframe = document.createElement('iframe');
            embedIframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
        `;
            const queryParams = new URLSearchParams(config).toString();
            embedIframe.src = `https://${config.organization}.feedbackchimp.space?${queryParams}`;
            embedDiv.appendChild(embedIframe);

            // Handle URL changes
            handleUrlChange();

            // Listen for popstate events (back/forward navigation)
            window.addEventListener('popstate', function (event) {
                handleUrlChange(true);
            });


            window.addEventListener('message', function (event) {
                if (event.origin === `https://${config.organization}.feedbackchimp.space`) {
                    if (event.data.type === 'routeChange') {
                        let newPath = `${event.data.path}`;
                        if (config.basePath) {
                            newPath = `${config.basePath}${newPath}`;
                        }
                        if (window.location.pathname !== newPath) {
                            window.history.pushState(null, '', newPath);
                        }
                    }
                }
            }, false);
        }
    };

    function createEmbedDiv() {
        embedDiv = document.querySelector('[data-feedbackchimp-embed]');
        if (!embedDiv) {
            embedDiv = document.createElement('div');
            embedDiv.setAttribute('data-feedbackchimp-embed', '');
            document.body.appendChild(embedDiv);
        }
    }

    function createManualPopup() {
        // Create style element for keyframes
        const style = document.createElement('style');
        style.textContent = `
            @keyframes changelogFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        manualPopupDiv = document.createElement('div');
        manualPopupDiv.style.cssText = `
            align-items: center;
            animation: changelogFadeIn .2s linear;
            backdrop-filter: blur(2px);
            display: flex;
            flex-direction: column;
            height: 100%;
            inset: 0;
            justify-content: start;
            opacity: 1;
            overflow: auto;
            overflow-x: hidden;
            position: fixed;
            transition: opacity .3s ease-in-out, visibility .3s linear;
            width: 100%;
            z-index: 2147483647;
            background: rgba(255, 255, 255, 0.1);
        `;

        manualPopupIframe = document.createElement('iframe');
        manualPopupIframe.style.cssText = `
            border-radius: 12px;
            margin-bottom: 12px;
            margin-top: 5%;
            max-height: 700px;
            min-height: 700px;
            overflow: hidden !important;
            transition: height .95s ease, min-height .95s ease, opacity .3s ease;
            user-select: none;
            width: 608px;
            z-index: 1000;
            background: rgb(245, 246, 249);
            box-shadow: rgba(0, 0, 0, 0.1) 0px 15px 25px;
            border: 1px solid rgb(222, 225, 234);
            height: 700px;
        `;

        manualPopupDiv.appendChild(manualPopupIframe);
        document.body.appendChild(manualPopupDiv);

        // Close manual popup when clicking outside
        manualPopupDiv.addEventListener('click', function (e) {
            if (e.target === manualPopupDiv) {
                manualPopupDiv.style.display = 'none';
            }
        });

        // Listen for close message from iframe
        window.addEventListener('message', function (event) {
            if (event.origin === iframeOrigin && event.data === 'closeManualChangelog') {
                manualPopupDiv.style.display = 'none';
            }
        }, false);
    }

    function updateBadgeContent(content) {
        if (updateBadge) {
            updateBadge.textContent = content;
            updateBadge.style.display = content ? 'inline' : 'none';
        }
    }

    function initializeFeedbackWidget(config) {
        // Create feedback wrapper div
        feedbackWrapperDiv = document.createElement('div');
        feedbackWrapperDiv.style.cssText = `
            position: fixed;
            ${config.placement === 'left' ? 'left: 20px;' : 'right: 20px;'}
            bottom: 20px;
            width: 400px;
            height: 600px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            z-index: 2147483647;
            display: none;
        `;

        // Create feedback iframe
        feedbackIframe = document.createElement('iframe');
        feedbackIframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 10px;
        `;

        // Construct query parameters
        const queryParams = new URLSearchParams(config).toString();

        let baseSrc = `${iframeOrigin}/feedback`;
        let iframeSrc = baseSrc;

        // Check if defaultBoard is set in the config, and append it to the iframe path
        if (config.defaultBoard) {
            iframeSrc += `/${encodeURIComponent(config.defaultBoard)}`;
        }

        // Set iframe src
        feedbackIframe.src = `${iframeSrc}?${queryParams}`;

        // Append iframe to wrapper div
        feedbackWrapperDiv.appendChild(feedbackIframe);

        // Append wrapper div to body
        document.body.appendChild(feedbackWrapperDiv);

        // Add click event to custom buttons
        const customButtons = document.querySelectorAll('[data-feedbackchimp-feedback]');
        customButtons.forEach(button => {
            button.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                const boardSlug = button.getAttribute('data-board');
                if (boardSlug) {
                    // Check if defaultBoard is set in the config, and append it to the iframe path
                    iframeSrc = baseSrc + `/${encodeURIComponent(boardSlug)}`;
                } else {
                    iframeSrc = baseSrc
                }
                feedbackIframe.src = `${iframeSrc}?${queryParams}`;
                openFeedbackWidget();
            });
        });

        // Create floating button if placement is specified
        if (config.placement) {
            createFloatingButton(config.placement, config.color || '#007bff');
        }

        document.addEventListener('click', function (event) {
            if (feedbackWrapperDiv.style.display === 'block'
                && !isRecentlyOpened
                && !feedbackWrapperDiv.contains(event.target)
                && !event.target.classList.contains('fc-feedback-widget-feedback-button')
                && !event.target.hasAttribute('data-feedbackchimp-feedback')
            ) {
                closeFeedbackWidget();
            }
        });

        window.addEventListener('message', function (event) {
            if (event.origin === iframeOrigin) {
                if (event.data === 'closeFeedbackWidget') {
                    closeFeedbackWidget();
                }
                // Handle other messages if needed
            }
        }, false);
    }

    function createFloatingButton(placement, color) {
        // Create a style element for CSS variables and keyframes
        const style = document.createElement('style');
        style.textContent = `
            :root {
                --fc-feedback-button-bg-color: ${color};
                --fc-feedback-button-text-color: 255, 255, 255;
            }
            @keyframes feedbackFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes animateFeedbackButtonLeft {
                from { right: -43px; }
                to { right: -3px; }
            }
        `;
        document.head.appendChild(style);

        const floatingButton = document.createElement('button');
        floatingButton.textContent = 'Feedback';
        floatingButton.className = 'fc-feedback-widget-feedback-button';
        const baseStyle = `
            transform: rotate(-90deg) translate(50%, -50%);
            transform-origin: 100% 50%;
            animation: feedbackFadeIn .3s ease-in;
            border-bottom: 2px solid hsla(0, 0%, 100%, .2);
            bottom: auto;
            top: 45%;
            padding: 0 16px 0 13px;
            background-color: var(--fc-feedback-button-bg-color);
            background-image: none;
            border: 1px solid hsla(0, 0%, 100%, .2);
            border-radius: 8px 8px 0 0;
            box-sizing: border-box;
            color: rgba(var(--fc-feedback-button-text-color), 1);
            cursor: pointer;
            display: block;
            font-size: 14px;
            font-weight: 600;
            height: 43px;
            letter-spacing: normal;
            line-height: 43px;
            margin: 0;
            position: fixed;
            text-align: center;
            transition: all .25s ease-in-out;
            user-select: none;
            width: auto;
            word-spacing: normal;
            z-index: 1000000;
            -webkit-font-smoothing: antialiased;
            box-shadow: 0 0 10px rgba(17, 24, 39, .2);
            white-space: nowrap !important;
        `;

        if (placement === 'left') {
            floatingButton.style.cssText = baseStyle + `
            left: -3px;
            animation: feedbackFadeIn .3s ease-in, animateFeedbackButtonLeft .3s ease-in;
            transform: rotate(90deg) translate(-50%, -50%);
            transform-origin: 0% 50%;
        `;
        } else {
            floatingButton.style.cssText = baseStyle + `
            right: -3px;
            animation: feedbackFadeIn .3s ease-in, animateFeedbackButtonRight .3s ease-in;
        `;
        }


        floatingButton.addEventListener('mouseover', function () {
            this.style[placement] = '0';
            this.style.boxShadow = '0 0 33px rgba(17, 24, 39, .4)';
        });

        floatingButton.addEventListener('mouseout', function () {
            this.style[placement] = '-3px'
            this.style.boxShadow = '0 0 10px rgba(17, 24, 39, .2)';
        });

        floatingButton.addEventListener('click', openFeedbackWidget);
        document.body.appendChild(floatingButton);
    }


    if (originalFeedbackchimp && originalFeedbackchimp.q && Array.isArray(originalFeedbackchimp.q)) {
        originalFeedbackchimp.q.forEach(function (args) {
            window.Feedbackchimp.apply(null, args);
        });
    }
})();
