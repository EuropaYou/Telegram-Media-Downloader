// ==UserScript==
// @name         Telegram Tools
// @version      0.5
// @description  Used to download streaming videos on Telegram
// @author       Nestor Qin and EuropaYou
// @license      GNU GPLv3
// @match        https://web.telegram.org/*
// @icon         https://img.icons8.com/color/452/telegram-app--v5.png
// @grant GM_openInTab
// @grant GM_registerMenuCommand
// @grant GM_unregisterMenuCommand
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_listValues
// ==/UserScript==

let autocheckNewMessages = false;
let newAutocheckNewMessages = false;
let downloadTextMessages = false;
let dontCareIfDownloaded = false;
let autoGrid = false;
let autodownload = false;
let goPrevious = false;
let goNext = false;

let goCheckLastURL = "";
let previousVideoURL = "";
let previousImageURL = "";
let _previousImageURL = "";
let totalDownloadCount = 0;
let downloadCount = 0;
let links = new Map();
let _links = new Map();

GM_setValue("Telegram", "");
console.log("Value:" + GM_getValue("Telegram"));

let option1 = GM_registerMenuCommand(`autocheckNewMessages: ${autocheckNewMessages}`, toggleAutocheckNewMessages, "e");
let option2 = GM_registerMenuCommand(`autodownload: ${autodownload}`, toggleAutodownload, "e");
let option3 = GM_registerMenuCommand(`downloadTextMessages: ${downloadTextMessages}`, toggleDownloadTextMessages, "e");
let option4 = GM_registerMenuCommand(`GoDirection: Next: ${goNext}, Previous: ${goPrevious}`, toggleGoDirection, "e");
let option5 = GM_registerMenuCommand(`newAutocheckNewMessages: ${autocheckNewMessages}`, toggleNewAutocheckNewMessages, "e");
let option6 = GM_registerMenuCommand(`dontCareIfDownloaded: ${dontCareIfDownloaded}`, toggleDontCareIfDownloaded, "e");

function rebuildMenu() {
    GM_unregisterMenuCommand(option1);
    GM_unregisterMenuCommand(option2);
    GM_unregisterMenuCommand(option3);
    GM_unregisterMenuCommand(option4);
    GM_unregisterMenuCommand(option5);
    GM_unregisterMenuCommand(option6);

    option1 = GM_registerMenuCommand(`autocheckNewMessages: ${autocheckNewMessages}`, toggleAutocheckNewMessages, "e");
    option2 = GM_registerMenuCommand(`autodownload: ${autodownload}`, toggleAutodownload, "e");
    option3 = GM_registerMenuCommand(`downloadTextMessages: ${downloadTextMessages}`, toggleDownloadTextMessages, "e");
    option4 = GM_registerMenuCommand(`GoDirection: Next: ${goNext}, Previous: ${goPrevious}`, toggleGoDirection, "e");
    option5 = GM_registerMenuCommand(`newAutocheckNewMessages: ${autocheckNewMessages}`, toggleNewAutocheckNewMessages, "e");
    option6 = GM_registerMenuCommand(`dontCareIfDownloaded: ${dontCareIfDownloaded}`, toggleDontCareIfDownloaded, "e");
}

function toggleBooleanValue(value) { return !value; }
function toggleAutocheckNewMessages() { autocheckNewMessages = toggleBooleanValue(autocheckNewMessages); rebuildMenu(); }
function toggleDownloadTextMessages() { downloadTextMessages = toggleBooleanValue(downloadTextMessages); rebuildMenu(); if (autocheckNewMessages && downloadTextMessages) { alert("downloadTextMessages doesn't work if autocheckNewMessages not enabled") } }
function toggleAutodownload() { autodownload = toggleBooleanValue(autodownload); rebuildMenu(); }
function toggleNewAutocheckNewMessages() { newAutocheckNewMessages = toggleBooleanValue(newAutocheckNewMessages); rebuildMenu(); }
function toggleDontCareIfDownloaded() { dontCareIfDownloaded = toggleBooleanValue(dontCareIfDownloaded); rebuildMenu(); }

function toggleGoDirection() {
    if (!goNext && !goPrevious) { goNext = true; alert('goNext'); }
    else {
        goNext = toggleBooleanValue(goNext);
        goPrevious = toggleBooleanValue(goPrevious);
        if (goNext) { alert('goNext'); }
        else { alert('goPrevious'); }
    }
    rebuildMenu();
}


(function () {
    const contentRangeRegex = /^bytes (\d+)-(\d+)\/(\d+)$/;

    const tel_download_video = (url, _chatName, _sender) => {
        try {
            let a = decodeURI(decodeURIComponent(url)).split("{")[2].split("\"")
            let b = a[a.length - 2];
            if (b !== "video/mp4") { console.log(b); }
        } catch (err) { console.error(err); }
        if (GM_getValue(`TGMDDOWN_video_${url}`, null) && !dontCareIfDownloaded) {
            console.log("Already downloaded");
            return;
        }
        console.log(GM_setValue(`TGMDDOWN_video_${url}`, "."));

        downloadCount++;
        totalDownloadCount++;
        let _blobs = [];
        let _next_offset = 0;
        let _total_size = null;
        let _file_extension = ".mp4";

        const fetchNextPart = () => {
            fetch(url, {
                "referrer": "https://web.telegram.org/k/",
                method: "GET",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:129.0) Gecko/20100101 Firefox/129.0",
                    "Accept": "*/*",
                    "Accept-Language": "en-GB,en;q=0.5",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    Range: `bytes=${_next_offset}-`,
                },
                mode: "cors"
            })
                .then((res) => {
                    if (res.status !== 206 && res.status !== 200) {
                        console.error("Non 200 response was received: " + res.status);
                        return;
                    }

                    const mime = res.headers.get("Content-Type").split(";")[0];
                    if (!mime.startsWith("video/")) {
                        console.error("Get non video response with MIME type " + mime);
                        throw "Get non video response with MIME type " + mime;
                    }
                    _file_extension = mime.split("/")[1];

                    const match = res.headers
                        .get("Content-Range")
                        .match(contentRangeRegex);

                    const startOffset = parseInt(match[1]);
                    const endOffset = parseInt(match[2]);
                    const totalSize = parseInt(match[3]);

                    if (startOffset !== _next_offset) {
                        console.error("Gap detected between responses.");
                        console.info("Last offset: " + _next_offset);
                        console.info("New start offset " + match[1]);
                        throw "Gap detected between responses.";
                    }
                    if (_total_size && totalSize !== _total_size) {
                        throw "Total size differs";
                    }

                    _next_offset = endOffset + 1;
                    _total_size = totalSize;

                    console.info(`Get response: ${res.headers.get("Content-Length")} bytes data from ${res.headers.get("Content-Range")} Progress: ${downloadCount}/${totalDownloadCount} ${((_next_offset * 100) / _total_size).toFixed(0)}%`);
                    return res.blob();
                })
                .then((resBlob) => {
                    _blobs.push(resBlob);
                })
                .then(() => {
                    if (_next_offset < _total_size) {
                        fetchNextPart();
                    } else {
                        save();
                    }
                })
                .catch((reason) => {
                    downloadCount--;
                    console.error(reason);
                });

        };

        const save = () => {
            console.info("Finish downloading blobs. Concatenating blobs and downloading...");
            const fileName = "[" + _chatName + "][" + _sender + "]" + decodeURIComponent(url) + _file_extension;
            console.log("Blob length: " + _blobs.length)

            let blob = new Blob(_blobs, { type: "video/mp4" });
            const blobUrl = window.URL.createObjectURL(blob);

            console.info("Final blob size: " + blob.size + " bytes");
            blob = 0;

            const a = document.createElement("a");
            document.body.appendChild(a);
            a.href = blobUrl;
            a.download = fileName;
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            console.info("Download triggered");
            downloadCount--;
        };

        fetchNextPart();
    };

    const tel_download_audio = (url, _chatName, _sender) => {
        if (GM_getValue(`TGMDDOWN_audio_${url}`, null) && !dontCareIfDownloaded) {
            console.log("Already downloaded");
            return;
        }
        console.log(GM_setValue(`TGMDDOWN_audio_${url}`, "."));
        downloadCount++;
        totalDownloadCount++;
        let _blobs = [];
        let _file_extension = ".ogg";

        const fetchNextPart = () => {
            fetch(url, { method: "GET" })
                .then((res) => {
                    if (res.status !== 206 && res.status !== 200) {
                        console.error("Non 200 response was received: " + res.status);
                        return;
                    }

                    const mime = res.headers.get("Content-Type").split(";")[0];
                    if (!mime.startsWith("audio/")) {
                        console.error("Get non audio response with MIME type " + mime);
                        throw "Get non audio response with MIME type " + mime;
                    }

                    console.info(`Progress: ${downloadCount}/${totalDownloadCount}`);
                    return res.blob();
                })
                .then((resBlob) => {
                    _blobs.push(resBlob);
                })
                .then(() => {
                    save();
                })
                .catch((reason) => {
                    downloadCount--;
                    console.error(reason);
                });

        };

        const save = () => {
            console.info("Finish downloading blobs. Concatenating blobs and downloading...");
            const fileName = "[" + _chatName + "][" + _sender + "]" + url + _file_extension;

            let blob = new Blob(_blobs, { type: "audio/ogg" });
            const blobUrl = window.URL.createObjectURL(blob);

            console.info("Final blob size in bytes: " + blob.size);
            blob = 0;

            const a = document.createElement("a");
            document.body.appendChild(a);
            a.href = blobUrl;
            a.download = fileName;
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);

            console.info("Download triggered");
            downloadCount--;
        };

        fetchNextPart();
    };

    const tel_download_gif = (url, _chatName, _sender) => {
        if (GM_getValue(`TGMDDOWN_gif_${url}`, null) && !dontCareIfDownloaded) { console.log(`TGMDDOWN_gif_${url} is already downloaded`); return; }
        console.log(GM_setValue(`TGMDDOWN_gif_${url}`, "."));
        downloadCount++;
        totalDownloadCount++;
        let _blobs = [];
        let _next_offset = 0;
        let _total_size = null;
        let _file_extension = "mp4";

        const fetchNextPart = () => {
            fetch(url, { method: "GET" })
                .then((res) => {
                    if (res.status !== 206 && res.status !== 200) {
                        console.error("Non 200 response was received: " + res.status);
                        return;
                    }

                    const mime = res.headers.get("Content-Type").split(";")[0];
                    if (!mime.startsWith("video/")) { throw "Get non video response with MIME type " + mime; }
                    _file_extension = mime.split("/")[1];

                    console.info(`Get response: ${res.headers.get("Content-Length")} bytes data from ${res.headers.get("Content-Range")} Progress: ${downloadCount}/${totalDownloadCount} ${((_next_offset * 100) / _total_size).toFixed(0)}%`);
                    return res.blob();
                })
                .then((resBlob) => {
                    _blobs.push(resBlob);
                })
                .then(() => {
                    if (_next_offset < _total_size) { fetchNextPart(); }
                    else { save(); }
                })
                .catch((reason) => {
                    downloadCount--;
                    console.error(reason);
                });

        };

        const save = () => {
            console.info("Finish downloading blobs. Concatenating blobs and downloading...");
            const fileName = "[" + _chatName + "][" + _sender + "]" + url + "." + _file_extension;

            let blob = new Blob(_blobs, { type: "video/mp4" });
            const blobUrl = window.URL.createObjectURL(blob);

            console.info("Final blob size in bytes: " + blob.size);
            blob = 0;

            const a = document.createElement("a");
            document.body.appendChild(a);
            a.href = blobUrl;
            a.download = fileName;
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
            console.info("Download triggered");
            downloadCount--;
        };

        fetchNextPart();
    };

    const tel_download_image = (imageUrl, _chatName, _sender) => {
        if (GM_getValue(`TGMDDOWN_image_${imageUrl}`, null) && !dontCareIfDownloaded) { console.log("Already downloaded"); return; }
        console.log(GM_setValue(`TGMDDOWN_image_${imageUrl}`, "."));
        const fileName = "[" + _chatName + "][" + _sender + "]" + imageUrl + ".jpeg";

        const a = document.createElement("a");
        document.body.appendChild(a);
        a.href = imageUrl;
        console.log(imageUrl);
        a.download = fileName;
        a.click();
        document.body.removeChild(a);
        console.info("Download triggered");
    };

    const goCheck = () => {
        if (goPrevious) {
            let item = document.getElementsByClassName("media-viewer-switcher-left");
            console.log("Going left"); item[0].click();
        } if (goNext) {
            let item = document.getElementsByClassName("media-viewer-switcher-right");
            console.log("Going right"); item[0].click();
        }
    }

    const isPeerTitleEqualsTo = (variable) => {
        if (typeof variable === 'string') { return document.getElementsByClassName("peer-title")[0].innerHTML == variable; }
        else if (Array.isArray(variable)) { for (let varg = 0; varg < variable.length; varg++) { if (document.getElementsByClassName("peer-title")[0].innerHTML === variable[varg]) { return true; } } return false; }
    }


    const createImageButtons = (ele, imageUrl) => {
        const container = document.createElement("div");
        container.className = "_tel_download_button_img_container";
        container.style.position = "absolute";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.display = "flex";
        container.style.justifyContent = "center";
        container.style.alignItems = "end";
        const downloadButton = document.createElement("button");
        downloadButton.className = "btn-icon default__button _tel_download_button_img";
        downloadButton.innerHTML = downloadIcon;
        downloadButton.style.marginBottom = "16px";
        downloadButton.style.marginRight = "16px";
        downloadButton.style.backgroundColor = "black";
        downloadButton.onclick = (e) => {
            let i = document.getElementsByClassName("media-viewer-date")[0];
            let aaa = "";
            for (let a = 0; a < i.children.length; a++) { aaa += i.children[a].innerHTML + " "; }
            console.log(aaa);
            e.stopPropagation();
            let sender = document.getElementsByClassName("media-viewer-name")[0].children[0].innerHTML;
            let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
            tel_download_image(imageUrl, chatName, sender.replaceAll(/(<)(.*?)(>)/g, ""));
        };
        const openInNewTab = document.createElement("button");
        openInNewTab.className = "btn-icon default__button _tel_download_button_img";
        openInNewTab.innerHTML = downloadIcon;
        openInNewTab.style.marginBottom = "16px";
        openInNewTab.style.backgroundColor = "red";
        openInNewTab.onclick = (e) => {
            window.open(imageUrl);
        };
        ele.appendChild(container);
        container.appendChild(downloadButton);
        container.appendChild(openInNewTab);
        if (!autodownload) {
            let rr = document.getElementsByClassName("media-viewer-buttons")[0];
            rr.querySelectorAll("._tel_download_size_text").forEach((e) => e.remove());
            textContainer = document.createElement("text");
            textContainer.className = "_tel_download_size_text";
            textContainer.style.marginTop = "8px";
            let size;
            fetch(imageUrl, { method: "GET", headers: { 'X-HTTP-Method-Override': 'HEAD' } }).then((res) => {
                let say = 0;
                let length = res.headers.get("content-length");
                while (length >= 1024) { length /= 1024; if (length > 1024) say++; }
                textContainer.innerHTML;
                if (say == 0) { textContainer.innerHTML = `${length.toFixed(2)} KB\n\n`; }
                else if (say == 1) { textContainer.innerHTML = `${length.toFixed(2)} MB\n\n`; }
                else if (say == 2) { textContainer.innerHTML = `${length.toFixed(2)} GB\n\n`; }
            })
            textContainer.innerHTML = size;
            rr.insertBefore(textContainer, rr.firstChild);
        }
    }
    console.info("Initialized");

    const downloadIcon = `
  <svg xmlns="http://www.w3.org/2000/svg" style="height:24px;width:24px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
    <path stroke-linecap="round" stroke-linejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
  </svg>`;
    let textContainer

    setInterval(() => {
        if (autoGrid) {
            let _grid = document.getElementsByClassName("grid-item media-container search-super-item");
            for (let currentINT = 0; currentINT < _grid.length; currentINT++) {
                if (_grid[currentINT].classList.contains('hide')) { _grid[currentINT].remove(); continue; }
                _grid[currentINT].classList.add("hide");
            }
        }
        if (autocheckNewMessages) {
            const currentBubbles = document.getElementsByClassName("attachment");
            const documentWrapper = document.getElementsByClassName("document-wrapper");
            console.log(currentBubbles.length);
            for (const wrapper of documentWrapper) {
                const audios = wrapper.getElementsByClassName("audio");
                if (audios.length !== 0) {
                    Array.from(audios).forEach(audio => {
                        const link = _links.get(audio.audio.getAttribute("src"));
                        if (link === undefined) {
                            console.log(`Video Source URL: ${audio.audio.getAttribute("src")}`);
                            let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                            let sender = "unknown"
                            tel_download_audio(audio.audio.getAttribute("src"), chatName, sender);
                            _links.set(audio.audio.getAttribute("src"), 0);
                        }
                    });
                }
            }
            for (const bubble of currentBubbles) {
                const images = bubble.getElementsByClassName("media-photo");
                const videos = bubble.getElementsByClassName("media-video");
                const round = bubble.getElementsByClassName("media-round");
                if (videos.length !== 0) {
                    Array.from(videos).forEach(video => {
                        const link = _links.get(video.src);
                        if (link === undefined) {
                            console.log(`Video Source URL: ${video.src}`);
                            let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                            let sender = "unknown"
                            tel_download_video(video.src, chatName, sender);
                            _links.set(video.src, 0);
                        }
                    });
                }
                if (images.length !== 0) {
                    Array.from(images).forEach(image => {
                        const link = _links.get(image.src);
                        if (link === undefined) {
                            console.log(`Image Source URL: ${image.src}`);
                            let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                            let sender = "unknown"
                            tel_download_image(image.src, chatName, sender);
                            _links.set(image.src, 0);
                        }
                    });
                }
                if (round.length !== 0) {
                    Array.from(round).forEach(image => {
                        const link = _links.get(image.querySelector("video").src);
                        if (link === undefined) {
                            console.log(`Video Source URL: ${image.querySelector("video").src}`);
                            let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                            let sender = "unknown"
                            fetch(image.querySelector("video").src).then((res) => {
                                console.log(res);
                                const a = document.createElement("a");
                                document.body.appendChild(a);
                                a.href = image.querySelector("video").src;
                                a.download = image.querySelector("video").src;
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(image.querySelector("video").src);
                            });
                            _links.set(image.querySelector("video").src);
                        }
                    });
                }
            }
            if (downloadTextMessages) {
                const messages = document.getElementsByClassName("message spoilers-container");
                for (const msg of messages) {
                    const link = _links.get(msg.innerText);
                    if (link === undefined) {
                        let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                        let sender = "unknown"
                        if (msg.getAttribute('class').includes('is-out')) {

                        }

                        if (msg.children.length > 0) { msg.children[0].remove(); }
                        let text = msg.innerHTML;

                        let a = document.createElement("a");
                        document.body.appendChild(a);
                        a.href = `data:text,${text}`;
                        a.download = `[${chatName}]_[${sender}].txt`;
                        a.click();
                        document.body.removeChild(a);
                        _links.set(msg.innerText, 0);
                    }
                }

            }
        }
        const ele = document.querySelector(".media-viewer-movers .media-viewer-aspecter");
        const ele2 = document.getElementsByClassName("audio is-voice");
        for (let a = 0; a < ele2.length; a++) {
            const link = links.get(ele2[a].audio.getAttribute("src"));
            if (link === undefined) {
                links.set(ele2[a].audio.getAttribute("src"), 0);
                const container = document.createElement("div");
                container.className = "_tel_download_button_voice_container";
                container.style.position = "absolute";
                container.style.width = "100%";
                container.style.height = "100%";
                container.style.display = "flex";
                container.style.justifyContent = "center";
                container.style.alignItems = "end";
                const downloadButton = document.createElement("button");
                downloadButton.className = "btn-icon default__button _tel_download_button_img";
                downloadButton.innerHTML = downloadIcon;
                downloadButton.style.marginBottom = "16px";
                downloadButton.style.backgroundColor = "black";
                downloadButton.onclick = (e) => {
                    e.stopPropagation();
                    tel_download_audio(ele2[a].audio.getAttribute("src"));
                };
                ele2[a].appendChild(container);
                container.appendChild(downloadButton);
            }
        }

        let image;
        try { image = ele.querySelector("img"); } catch (exception) { }
        if (!ele || ele.children.length <= 0) return;
        else if (ele.querySelector(".ckin__player")/*ele.querySelector("video").src != null*/) {
            document.querySelectorAll("._tel_download_button_img_container").forEach((e) => e.remove());

            const controls = ele.querySelector(".default__controls .right-controls");
            const videoUrl = ele.querySelector("video").src;
            if (goCheckLastURL == videoUrl) { goCheck(); return; }

            if (autodownload && (previousVideoURL !== videoUrl || previousVideoURL == "")) {
                const link = links.get(videoUrl);
                if (link === undefined) {
                    previousVideoURL = videoUrl;
                    let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                    let sender = document.getElementsByClassName("media-viewer-name")[0].children[0].textContent;
                    tel_download_video(videoUrl, chatName, sender.replaceAll(/(<)(.*?)(>)/g, ""));
                    links.set(videoUrl, 0);
                } else { console.info("Exists!"); }

                goCheckLastURL = videoUrl;
                goCheck();
            }
            if (controls && !controls.querySelector("._tel_download_button_video")) {
                const brControls = controls.querySelector(".bottom-controls .right-controls");
                const downloadButton = document.createElement("button");
                downloadButton.className = "btn-icon default__button _tel_download_button_video";
                downloadButton.innerHTML = downloadIcon;
                downloadButton.onclick = () => {
                    let i = document.getElementsByClassName("media-viewer-date")[0];
                    let aaa = "";
                    for (let a = 0; a < i.children.length; a++) { aaa += i.children[a].innerHTML + " "; }
                    console.log(aaa);
                    let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                    let sender = document.getElementsByClassName("media-viewer-name")[0].children[0].textContent;
                    tel_download_video(videoUrl, chatName, sender.replaceAll(/(<)(.*?)(>)/g, ""));
                };
                const openInNewTab = document.createElement("button");
                openInNewTab.className = "btn-icon default__button _tel_download_new_tab_video";
                openInNewTab.innerHTML = downloadIcon;
                openInNewTab.style.backgroundColor = "red";
                openInNewTab.onclick = (e) => { window.open(videoUrl); };
                controls.prepend(openInNewTab);
                controls.prepend(downloadButton);

                let rr = document.getElementsByClassName("media-viewer-buttons")[0];
                rr.querySelectorAll("._tel_download_size_text").forEach((e) => e.remove());
            }
        } else if (!ele.querySelector("._tel_download_button_img")) {
            let chatName = document.getElementsByClassName("peer-title")[0].textContent;
            if (chatName == "ENTER CHAT NAME TO DISABLE AUTO DOWNLOAD") { goCheck(); return; }
            const imageUrl = ele.querySelector("img.thumbnail").src;
            if (goCheckLastURL == imageUrl) { goCheck(); return; }
            if (previousImageURL !== imageUrl) { createImageButtons(ele, imageUrl); }
            if (autodownload && (previousImageURL !== imageUrl || previousVideoURL == "")) {
                const link = links.get(imageUrl);
                if (link == undefined) {
                    previousImageURL = imageUrl;
                    tel_download_image(imageUrl, chatName);
                    links.set(imageUrl, 0);
                } else { console.info("Exists!") }
                goCheck();
                goCheckLastURL = imageUrl;
            }
        }
        else if (image) {
            const imageUrl = ele.querySelector("img.thumbnail").src;

            let chatName = document.getElementsByClassName("peer-title")[0].textContent;
            if (chatName == "ENTER CHAT NAME TO DISABLE AUTO DOWNLOAD" && goCheckLastURL == chatName) { goCheck(); return; }
            if (_previousImageURL !== imageUrl) { createImageButtons(ele, imageUrl); _previousImageURL = imageUrl; }
            if (autodownload && (previousImageURL !== imageUrl || previousVideoURL == "")) {
                const link = links.get(imageUrl);
                if (link == undefined) {
                    previousImageURL = imageUrl;
                    tel_download_image(imageUrl, chatName);
                    links.set(imageUrl, 0);
                } else { console.info("Exists!") }
                goCheck();
                goCheckLastURL = imageUrl;
            }
        }
        else if (ele.querySelector("video").src) {
            console.info(ele.querySelector("video").src);
            document.querySelectorAll("._tel_download_button_img_container").forEach((e) => e.remove());

            const controls = ele.querySelector(".default__controls.ckin__controls");
            const videoUrl = ele.querySelector("video").src;
            if (goCheckLastURL == videoUrl) { goCheck(); return; }

            if (autodownload && (previousVideoURL !== videoUrl || previousVideoURL == "")) {
                const link = links.get(videoUrl);
                if (link === undefined) {
                    previousVideoURL = videoUrl;
                    let chatName = document.getElementsByClassName("peer-title")[0].textContent;
                    tel_download_gif(videoUrl, chatName);
                    links.set(videoUrl, 0);
                } else { console.info("Exists!"); }
                goCheckLastURL = videoUrl;
                goCheck();
            }

            if (controls && !controls.querySelector("._tel_download_button_video")) {
                const brControls = controls.querySelector(".bottom-controls .right-controls");
                const downloadButton = document.createElement("button");
                downloadButton.className = "btn-icon default__button _tel_download_button_video";
                downloadButton.innerHTML = downloadIcon;
                downloadButton.onclick = () => {
                    let i = document.getElementsByClassName("media-viewer-date")[0];
                    let aaa = "";
                    for (let a = 0; a < i.children.length; a++) { aaa += i.children[a].innerHTML + " "; }
                    console.log(aaa);
                    let chatName = document.getElementsByClassName("chat-info-container")[0].getElementsByClassName("peer-title")[0].textContent;
                    let sender = document.getElementsByClassName("media-viewer-name")[0].children[0].innerHTML;
                    tel_download_video(videoUrl, chatName, sender.replaceAll(/(<)(.*?)(>)/g, ""));
                };
                brControls.prepend(downloadButton);
            }
        }
        if (newAutocheckNewMessages) {
            let left = document.getElementsByClassName("media-viewer-switcher-left");
            let right = document.getElementsByClassName("media-viewer-switcher-right");

            if (!right[0].getAttribute('class').includes('hide')) { right[0].click(); }
            else { left[0].click(); }
        }
    }, 500);
})();
