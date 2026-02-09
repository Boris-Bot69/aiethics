(function () {
    const form = document.getElementById("imageMixerForm");
    const originalInput = document.getElementById("originalImage");
    const textureInput  = document.getElementById("textureImage");

    const resultArea   = document.getElementById("resultArea");
    const mixedImgEl   = document.getElementById("mixedImage");
    const placeholder  = document.getElementById("resultPlaceholder");

    const spinner    = document.getElementById("loadingSpinner");
    const buttonText = document.getElementById("buttonText");
    const statusMsg  = document.getElementById("statusMessage");
    const mixButton  = document.getElementById("mixButton");

    // === NEW: fullscreen loading overlay (created once) ===
    const overlay = (() => {
        const el = document.createElement("div");
        el.className = "loading-overlay";
        el.innerHTML = `
      <div class="spinner-lg" style="
        width:42px;height:42px;border-radius:50%;
        border:4px solid rgba(0,0,0,0.15);border-left-color:#0065BD;
        animation: spin 0.8s linear infinite;"></div>`;
        document.body.appendChild(el);
        return el;
    })();
    const overlayOn  = () => overlay.classList.add("is-active");
    const overlayOff = () => overlay.classList.remove("is-active");

    // --- Add a strength slider under your submit section (no CSS changes needed)
    const submitSection = form.querySelector(".submit-section");
    const sliderWrap = document.createElement("div");
    sliderWrap.style.display = "grid";
    sliderWrap.style.placeItems = "center";
    sliderWrap.style.gap = "0.25rem";
    sliderWrap.innerHTML = `
    <label style="font-weight:500;">Texture strength</label>
    <input id="strengthSlider" type="range" min="0" max="100" value="60" step="1" style="width:240px;">
    <div style="font-size:0.9rem;color:#666;">
      <span>Structure</span>
      <span style="margin:0 0.5rem;">⬅︎</span>
      <strong id="strengthValue">0.60</strong>
      <span style="margin:0 0.5rem;">➡︎</span>
      <span>Texture</span>
    </div>
  `;
    submitSection.insertBefore(sliderWrap, submitSection.firstChild);
    const strengthSlider = document.getElementById("strengthSlider");
    const strengthValue  = document.getElementById("strengthValue");
    strengthSlider.addEventListener("input", () => {
        strengthValue.textContent = (Number(strengthSlider.value) / 100).toFixed(2);
    });

    // Create a download button once we have a result
    const dlBtn = document.createElement("a");
    dlBtn.textContent = "Download result";
    dlBtn.className = "mix-button";
    dlBtn.style.textDecoration = "none";
    dlBtn.style.display = "none"; // hidden until we have an image
    submitSection.appendChild(dlBtn);

    async function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }

    // === NEW: robust JSON parsing that never throws "Unexpected token" to the user ===
    async function safeJson(resp) {
        const ct = resp.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
            // Response was likely HTML or empty; read text and throw a friendly error
            const _t = await resp.text().catch(() => "");
            throw new Error("Temporary non-JSON response");
        }
        return resp.json();
    }

    // === NEW: retry wrapper with backoff (e.g., for cold starts / transient HTML) ===
    async function withRetry(fn, { retries = 3, initialDelay = 600 } = {}) {
        let err;
        let delay = initialDelay;
        for (let i = 0; i <= retries; i++) {
            try {
                return await fn();
            } catch (e) {
                err = e;
                if (i < retries) {
                    // keep the overlay on; optionally update statusMsg if you want
                    await new Promise(r => setTimeout(r, delay));
                    delay *= 1.7; // backoff
                }
            }
        }
        throw err;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        statusMsg.textContent = "";
        if (!originalInput.files[0] || !textureInput.files[0]) {
            statusMsg.textContent = "Please select both images.";
            return;
        }

        // UI: loading
        mixButton.disabled = true;
        spinner.classList.remove("hidden");
        buttonText.textContent = "Combining…";
        overlayOn(); // <=== show overlay

        try {
            const [structureDataUrl, textureDataUrl] = await Promise.all([
                fileToDataURL(originalInput.files[0]),
                fileToDataURL(textureInput.files[0]),
            ]);

            const strength = Number(strengthSlider.value) / 100;

            // === NEW: use retry + safeJson to avoid showing raw parse errors ===
            const data = await withRetry(async () => {
                const resp = await fetch("/mix-texture", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        structureBase64: structureDataUrl,
                        textureBase64: textureDataUrl,
                        strength,
                        prompt:
                            "Apply the material naturally on surfaces. Respect lighting and shading of the structure.",
                    }),
                });

                if (!resp.ok) {
                    // Try to extract JSON error; if not JSON, throw friendly message
                    let errMsg = "Request failed";
                    try {
                        const j = await safeJson(resp);
                        errMsg = j?.error || errMsg;
                    } catch {
                        // swallow specific content; return generic message
                        errMsg = "Server is busy. Please try again.";
                    }
                    throw new Error(errMsg);
                }

                // Parse JSON safely (won't throw the 'Unexpected token' to user)
                return safeJson(resp);
            }, { retries: 3, initialDelay: 700 });

            // Show result
            placeholder.style.display = "none";
            mixedImgEl.style.display = "block";
            mixedImgEl.src = data.imageDataUrl;
            mixedImgEl.classList.add("zoomable");
            resultArea.classList.remove("hidden");

            // Enable downloading
            dlBtn.href = data.imageDataUrl;
            dlBtn.download = "texture-fusion.png";
            dlBtn.style.display = "inline-flex";

            statusMsg.textContent = "✅ Done!";
        } catch (err) {
            // Keep messages friendly; no raw error details.
            statusMsg.textContent = "Please wait for a moment and try again.";
            // (Overlay remains visible only during retries; it's turned off in finally)
        } finally {
            mixButton.disabled = false;
            spinner.classList.add("hidden");
            buttonText.textContent = "Combine with AI";
            overlayOff(); // <=== hide overlay
        }
    });
})();
