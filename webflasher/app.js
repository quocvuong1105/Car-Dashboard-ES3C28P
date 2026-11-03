```javascript
const OWNER = "quocvuong1105";
const REPO = "Car-Dashboard-ES3C28P";

const API =
  `https://api.github.com/repos/${OWNER}/${REPO}/releases`;

const FIRMWARE_BASE =
  `./firmware/`;

const releaseSelect = document.querySelector("#release");
const installer = document.querySelector("#installer");
const info = document.querySelector("#firmware-info");
const note = document.querySelector("#release-note");

let releases = [];
let selectedBoard = "ES3C28P";
let manifestUrl = null;

const BOARD_FIRMWARE = {
  ES3C28P: "CarCYD-ES3C28P-merged.bin"
};

function setInfo(message, status = "info") {
  info.querySelector("p").textContent = message;
  info.dataset.status = status;
}

function selectedRelease() {
  return releases.find(
    release => release.id === Number(releaseSelect.value)
  );
}

async function updateManifest() {
  clearManifest();

  const release = selectedRelease();

  if (!release) {
    setInfo("Chưa chọn phiên bản firmware.", "warning");
    return;
  }

  const expected = BOARD_FIRMWARE[selectedBoard];

  const asset = release.assets?.find(
    item => item.name === expected && item.size > 0
  );

  if (!asset) {
    setInfo(
      `Release ${release.tag_name} chưa có file ${expected}.`,
      "warning"
    );
    return;
  }

  const firmwareUrl = firmwareUrlFor(release);

  const manifest = {
    name: `Car Dashboard ${selectedBoard}`,
    version: release.tag_name,
    new_install_prompt_erase: true,
    builds: [
      {
        chipFamily: "ESP32-S3",
        parts: [
          {
            path: firmwareUrl,
            offset: 0
          }
        ]
      }
    ]
  };

  const blob = new Blob(
    [JSON.stringify(manifest)],
    { type: "application/json" }
  );

  const newManifestUrl = URL.createObjectURL(blob);
  manifestUrl = newManifestUrl;

  try {
    // Đảm bảo ESP Web Tools đã được khởi tạo.
    await customElements.whenDefined("esp-web-install-button");

    // Không gán manifest cũ nếu người dùng đã đổi phiên bản.
    if (manifestUrl !== newManifestUrl) {
      URL.revokeObjectURL(newManifestUrl);
      return;
    }

    // Gán trực tiếp qua property của ESP Web Tools.
    installer.manifest = newManifestUrl;

    const size = (asset.size / 1024 / 1024).toFixed(2);

    setInfo(
      `${release.tag_name} · ${selectedBoard} · ${size} MB. Firmware đã sẵn sàng.`,
      "success"
    );

    console.log("ESP Web Tools manifest:", manifest);
    console.log("Manifest URL:", newManifestUrl);
    console.log("Firmware URL:", firmwareUrl);

  } catch (error) {
    console.error("Manifest initialization error:", error);

    setInfo(
      "Không thể khởi tạo manifest: " + error.message,
      "error"
    );
  }
}

function firmwareUrlFor(release) {
  const tag = release.tag_name;

  return new URL(
    `${FIRMWARE_BASE}${encodeURIComponent(tag)}.bin`,
    document.baseURI
  ).href;
}

function updateManifest() {
  clearManifest();

  const release = selectedRelease();

  if (!release) {
    setInfo("Chưa chọn phiên bản firmware.", "warning");
    return;
  }

  const expected = BOARD_FIRMWARE[selectedBoard];

  const asset = release.assets?.find(
    item => item.name === expected && item.size > 0
  );

  if (!asset) {
    setInfo(
      `Release ${release.tag_name} chưa có file ${expected}.`,
      "warning"
    );
    return;
  }

  const firmwareUrl = firmwareUrlFor(release);

  const manifest = {
    name: `Car Dashboard ${selectedBoard}`,
    version: release.tag_name,
    new_install_prompt_erase: true,
    builds: [
      {
        chipFamily: "ESP32-S3",
        parts: [
          {
            path: firmwareUrl,
            offset: 0
          }
        ]
      }
    ]
  };

  const blob = new Blob(
    [JSON.stringify(manifest)],
    { type: "application/json" }
  );

  manifestUrl = URL.createObjectURL(blob);
  installer.setAttribute("manifest", manifestUrl);

  const size = (asset.size / 1024 / 1024).toFixed(2);

  setInfo(
    `${release.tag_name} · ${selectedBoard} · ${size} MB. Firmware đã sẵn sàng.`,
    "success"
  );
}

async function loadReleases() {
  releaseSelect.disabled = true;
  note.textContent = "Đang kết nối GitHub Releases...";

  clearManifest();

  try {
    const response = await fetch(API, {
      headers: {
        Accept: "application/vnd.github+json"
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          "Không tìm thấy Release. Kiểm tra repository Public và đã phát hành firmware."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "GitHub API đang giới hạn truy cập. Hãy thử tải lại sau."
        );
      }

      throw new Error(
        `GitHub API lỗi HTTP ${response.status}.`
      );
    }

    const data = await response.json();

    releases = data
      .filter(release =>
        !release.draft &&
        !release.prerelease
      )
      .sort((a, b) =>
        new Date(b.published_at) -
        new Date(a.published_at)
      );

    releaseSelect.innerHTML = "";

    if (!releases.length) {
      throw new Error(
        "Chưa có GitHub Release. Hãy chạy workflow Release Firmware."
      );
    }

    releases.forEach(release => {
      const option = document.createElement("option");

      option.value = release.id;
      option.textContent =
        `${release.tag_name} · ${
          new Date(release.published_at).toLocaleDateString("vi-VN")
        }`;

      releaseSelect.appendChild(option);
    });

    releaseSelect.disabled = false;

    note.textContent =
      `Tìm thấy ${releases.length} phiên bản. Đang hiển thị phiên bản mới nhất trước.`;

    updateManifest();

  } catch (error) {
    releases = [];

    releaseSelect.innerHTML = "";
    releaseSelect.appendChild(
      new Option("Không có phiên bản khả dụng", "")
    );

    setInfo(error.message, "error");
    note.textContent = error.message;
  }
}

releaseSelect.addEventListener(
  "change",
  updateManifest
);

document
  .querySelectorAll('input[name="board"]')
  .forEach(input => {
    input.addEventListener("change", () => {
      selectedBoard = input.value;
      updateManifest();
    });
  });

loadReleases();
```