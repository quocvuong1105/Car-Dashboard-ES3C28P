
const OWNER = "quocvuong1105";
const REPO = "Car-Dashboard-ES3C28P";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases`;

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
  return releases.find(r => r.id === Number(releaseSelect.value));
}

function assetFor(release) {
  const expected = BOARD_FIRMWARE[selectedBoard];
  return release?.assets?.find(a =>
    a.name === expected && a.size > 0
  ) || null;
}

function clearManifest() {
  installer.removeAttribute("manifest");

  if (manifestUrl) {
    URL.revokeObjectURL(manifestUrl);
    manifestUrl = null;
  }
}

function updateManifest() {
  clearManifest();

  const release = selectedRelease();
  const asset = assetFor(release);

  if (!release) {
    setInfo("Chưa chọn phiên bản firmware.", "warning");
    return;
  }

  if (!asset) {
    setInfo(
      `Release ${release.tag_name} chưa có file ${BOARD_FIRMWARE[selectedBoard]}.`,
      "warning"
    );
    return;
  }

  const manifest = {
    name: `Car Dashboard ${selectedBoard}`,
    version: release.tag_name,
    new_install_prompt_erase: true,
    builds: [{
      chipFamily: "ESP32-S3",
      parts: [{
        path: new URL(
          `./firmware/${encodeURIComponent(asset.name)}`,
          location.href
        ).href,
        offset: 0
      }]
    }]
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

      throw new Error(`GitHub API lỗi HTTP ${response.status}.`);
    }

    const data = await response.json();

    releases = data
      .filter(r => !r.draft && !r.prerelease)
      .sort((a, b) =>
        new Date(b.published_at) - new Date(a.published_at)
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
        `${release.tag_name} · ${new Date(
          release.published_at
        ).toLocaleDateString("vi-VN")}`;

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

releaseSelect.addEventListener("change", updateManifest);

document.querySelectorAll('input[name="board"]').forEach(input => {
  input.addEventListener("change", () => {
    selectedBoard = input.value;
    updateManifest();
  });
});

loadReleases();
