

let chatPanel, chatMessages, editor, sendBtn, imageUpload;
let uploadedBase64 = null;
let aiConsentGiven = false;
let lastHumanUploadBase64 = null;

const frameOrder = ["A8", "A7", "A6", "A5", "A4"];
let stage = "A8";
let waitingForHumanUploadOf = null;
let lastPreviewMeta = null;

// ===============================
// DOM READY
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    chatPanel = document.querySelector(".chat-panel");
    chatMessages = chatPanel?.querySelector(".chat-messages");
    editor = document.getElementById("chatEditor");
    sendBtn = chatPanel.querySelector(".send-btn");
    imageUpload = document.getElementById("imageUpload");

    addBotMessage(`
👋 Welcome to <em>Expanded Frames</em>!<br/>
Upload your <b>A8</b> artwork with 📷.<br/>
We’ll show a grey canvas preview for the next frame, and AI will fill the grey area.<br/>
The previous human area will always stay highlighted in <b style="color:#1e63ff">blue</b>.
  `);

    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn && imageUpload) {
        uploadBtn.addEventListener("click", () => imageUpload.click());
        imageUpload.addEventListener("change", handleImageUpload);
    }

    if (sendBtn) sendBtn.addEventListener("click", sendUserMessage);

    const modal = document.getElementById("consentModal");
    const agreeBtn = document.getElementById("agreeBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    if (modal && agreeBtn && cancelBtn) {
        agreeBtn.addEventListener("click", () => {
            aiConsentGiven = true;
            modal.remove();
            addBotMessage("✅ Great! You can now generate AI expansions.");
        });
        cancelBtn.addEventListener("click", () => {
            modal.remove();
            addBotMessage("⚠️ AI generation disabled — you can still chat about your artwork.");
        });
    }
});

// ===============================
// MESSAGE HELPERS
// ===============================
function addMessage(text, sender = "bot", node = null) {
    const msg = document.createElement("div");
    msg.className = `message ${sender === "user" ? "user-align" : ""}`;

    const avatar = document.createElement("div");
    avatar.classList.add("avatar");

    const content = document.createElement("div");
    content.classList.add("text");

    if (node) content.appendChild(node);
    if (text) {
        const p = document.createElement("p");
        p.innerHTML = text;
        content.appendChild(p);
    }

    msg.appendChild(avatar);
    msg.appendChild(content);
    chatMessages.appendChild(msg);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addBotMessage(html) {
    addMessage(html, "bot");
}
function addUserMessage(html) {
    addMessage(html, "user");
}

function addImageBubble(src, extraBelow = null) {
    const wrap = document.createElement("div");
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("chat-image-preview");
    wrap.appendChild(img);

    if (extraBelow) wrap.appendChild(extraBelow);
    addMessage(null, "bot", wrap);
    return { wrap, img };
}

// ===============================
// IMAGE UPLOAD
// ===============================
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
        uploadedBase64 = ev.target.result;
        lastHumanUploadBase64 = ev.target.result;

        if (waitingForHumanUploadOf) {
            stage = waitingForHumanUploadOf;
            waitingForHumanUploadOf = null;
        }

        addUserMessage(`📸 Uploaded ${stage} artwork.`);
        const nextStage = getNextStage();
        if (!nextStage) {
            addBotMessage("You're already at A4. Nothing to expand.");
            return;
        }

        await showGreyPreview(uploadedBase64, stage, nextStage);
    };
    reader.readAsDataURL(file);
}

function getNextStage() {
    const i = frameOrder.indexOf(stage);
    return i >= 0 ? frameOrder[i + 1] : null;
}

// ===============================
// PREVIEW GREY CANVAS
// ===============================
async function showGreyPreview(base64, currentStage, nextStage) {
    const img = await loadImage(base64);
    const scaleMap = { A8: 1.35, A7: 1.55, A6: 1.75, A5: 1.95 };
    const scale = scaleMap[currentStage] || 1.5;

    const newW = Math.round(img.width * scale);
    const newH = Math.round(img.height * scale);
    const offX = Math.round((newW - img.width) / 2);
    const offY = Math.round((newH - img.height) / 2);

    // 1️⃣ canvas for chat preview (with border)
    const previewCanvas = document.createElement("canvas");
    previewCanvas.width = newW;
    previewCanvas.height = newH;
    const previewCtx = previewCanvas.getContext("2d");
    previewCtx.fillStyle = "#d9d9d9";
    previewCtx.fillRect(0, 0, newW, newH);
    previewCtx.drawImage(img, offX, offY);
    previewCtx.lineWidth = 6;
    previewCtx.strokeStyle = "#1e63ff";
    previewCtx.strokeRect(offX + 1, offY + 1, img.width - 2, img.height - 2);

    const previewDataUrl = previewCanvas.toDataURL("image/png");

    // 2️⃣ second clean canvas for AI input (no border)
    const aiCanvas = document.createElement("canvas");
    aiCanvas.width = newW;
    aiCanvas.height = newH;
    const aiCtx = aiCanvas.getContext("2d");
    aiCtx.fillStyle = "#d9d9d9";
    aiCtx.fillRect(0, 0, newW, newH);
    aiCtx.drawImage(img, offX, offY);

    const aiDataUrl = aiCanvas.toDataURL("image/png");

    lastPreviewMeta = {
        w: newW,
        h: newH,
        x: offX,
        y: offY,
        innerW: img.width,
        innerH: img.height,
        dataUrl: aiDataUrl,
        previewUrl: previewDataUrl
    };

    const expandBtn = document.createElement("button");
    expandBtn.className = "expand-btn";
    expandBtn.textContent = `✨ Expand to ${nextStage}`;
    expandBtn.onclick = async () => {
        expandBtn.disabled = true;
        expandBtn.textContent = "🧠 Expanding...";
        await expandWithAI(currentStage, nextStage, lastPreviewMeta, expandBtn);
    };

    addBotMessage(`🖼️ Preview for <b>${nextStage}</b>: grey area will be filled by AI.`);
    addImageBubble(previewDataUrl, expandBtn);
}


// ===============================
// EXPAND WITH AI
// ===============================
async function expandWithAI(currentStage, nextStage, previewMeta, btnEl) {


    addBotMessage(`🧠 Expanding <b>${currentStage}</b> → <b>${nextStage}</b>…`);

    try {
        const response = await fetch("http://localhost:3000/expand_canvas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: previewMeta.dataUrl, from: currentStage, to: nextStage }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const { image_url } = await response.json();

        const outpaintedImg = await loadImage(image_url);
        const humanImg = await loadImage(lastHumanUploadBase64 || uploadedBase64);

        const resultCanvas = document.createElement("canvas");
        resultCanvas.width = previewMeta.w;
        resultCanvas.height = previewMeta.h;
        const rctx = resultCanvas.getContext("2d");
        rctx.drawImage(outpaintedImg, 0, 0, resultCanvas.width, resultCanvas.height);

        const match = await locateHumanRegion(resultCanvas, humanImg);
        const rect = match || { x: previewMeta.x, y: previewMeta.y, w: previewMeta.innerW, h: previewMeta.innerH };

        rctx.lineWidth = 6;
        rctx.strokeStyle = "#1e63ff";
        rctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);

        const stampedUrl = resultCanvas.toDataURL("image/png");

        addBotMessage(`✨ AI expanded to <b>${nextStage}</b>. <span style="color:#1e63ff">Blue</span> border = previous human area.`);
        const { wrap } = addImageBubble(stampedUrl);

        const dl = document.createElement("button");
        dl.className = "download-btn";
        dl.textContent = "⬇️ Download image";
        dl.onclick = () => {
            const a = document.createElement("a");
            a.href = stampedUrl;
            a.download = `${nextStage}_expanded.png`;
            a.click();
        };
        wrap.appendChild(dl);

        if (btnEl?.parentElement) btnEl.parentElement.remove();

        // ✅ Update current state and base image
        stage = nextStage;
        uploadedBase64 = stampedUrl; // use AI image as base for next stage
        lastHumanUploadBase64 = stampedUrl;

        const next = getNextStage();

        if (next) {
            addBotMessage(`Preparing preview for <b>${next}</b>...`);
            await showGreyPreview(stampedUrl, stage, next); // ✅ Automatically create new grey preview
        } else {
            const pdfBtn = document.createElement("button");
            pdfBtn.className = "download-btn";
            pdfBtn.textContent = "📄 Download Summary PDF";
            pdfBtn.onclick = async () => {
                addBotMessage("📄 Generating your summary PDF...");
                try {
                    const response = await fetch("http://localhost:3000/summary_a4");
                    if (!response.ok) throw new Error("Failed to generate PDF");
                    const { pdf_url } = await response.json();
                    const a = document.createElement("a");
                    a.href = pdf_url;
                    a.download = "Expanded_Frames_Summary_A8_to_A4.pdf";
                    a.click();
                } catch (err) {
                    addBotMessage("⚠️ PDF generation failed: " + err.message);
                }
            };
            addMessage(null, "bot", pdfBtn);
        }

    } catch (err) {
        console.error(err);
        addBotMessage("⚠️ Expansion failed. Check the server logs.");
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = `✨ Expand to ${nextStage}`;
        }
    }
}


// ===============================
// TEMPLATE MATCHING (auto-align blue border)
// ===============================
async function locateHumanRegion(resultCanvas, humanImg) {
    const MAX_SIDE = 640;

    function toCanvasScaled(imgOrCanvas, maxSide) {
        const w = imgOrCanvas.width, h = imgOrCanvas.height;
        const s = Math.min(1, maxSide / Math.max(w, h));
        const cw = Math.round(w * s), ch = Math.round(h * s);
        const c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        const cx = c.getContext("2d");
        cx.drawImage(imgOrCanvas, 0, 0, cw, ch);
        return { c, scale: s };
    }

    const resScaled = toCanvasScaled(resultCanvas, MAX_SIDE);
    const humScaled = toCanvasScaled(humanImg, Math.round(MAX_SIDE * 0.6));

    const resData = getGray(resScaled.c);
    const humData = getGray(humScaled.c);

    const strides = 3;
    const scales = [0.95, 1.0, 1.05];
    let best = { score: -Infinity, x: 0, y: 0, w: humScaled.c.width, h: humScaled.c.height, scale: 1 };

    for (const s of scales) {
        const tw = Math.round(humScaled.c.width * s);
        const th = Math.round(humScaled.c.height * s);
        const tCanvas = document.createElement("canvas");
        tCanvas.width = tw; tCanvas.height = th;
        tCanvas.getContext("2d").drawImage(humScaled.c, 0, 0, tw, th);
        const tData = getGray(tCanvas);

        for (let y = 0; y <= resScaled.c.height - th; y += strides) {
            for (let x = 0; x <= resScaled.c.width - tw; x += strides) {
                const score = ncc(resData, resScaled.c.width, resScaled.c.height, tData, tw, th, x, y);
                if (score > best.score) best = { score, x, y, w: tw, h: th, scale: s };
            }
        }
    }

    if (best.score < 0.55) return null;
    const inv = 1 / resScaled.scale;
    return { x: Math.round(best.x * inv), y: Math.round(best.y * inv), w: Math.round(best.w * inv), h: Math.round(best.h * inv) };

    function getGray(canvas) {
        const ctx = canvas.getContext("2d");
        const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const arr = new Float32Array(canvas.width * canvas.height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) arr[j] = (0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2]) / 255;
        return { arr, width, height: canvas.height };
    }

    function ncc(res, rw, rh, tmpl, tw, th, x, y) {
        let sumR = 0, sumT = 0, sumR2 = 0, sumT2 = 0, sumRT = 0;
        for (let j = 0; j < th; j++) {
            let rIdx = (y + j) * rw + x;
            let tIdx = j * tw;
            for (let i = 0; i < tw; i++, rIdx++, tIdx++) {
                const R = res.arr[rIdx], T = tmpl.arr[tIdx];
                sumR += R; sumT += T;
                sumR2 += R * R; sumT2 += T * T;
                sumRT += R * T;
            }
        }
        const N = tw * th;
        const numerator = sumRT - (sumR * sumT) / N;
        const denomL = Math.max(1e-6, sumR2 - (sumR * sumR) / N);
        const denomR = Math.max(1e-6, sumT2 - (sumT * sumT) / N);
        const denom = Math.sqrt(denomL * denomR);
        return denom ? numerator / denom : -Infinity;
    }
}

// ===============================
// HELPERS
// ===============================
function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

function sendUserMessage() {
    const userText = editor.textContent.trim();
    if (!userText) return;
    addUserMessage(userText);
    editor.textContent = "";
}
