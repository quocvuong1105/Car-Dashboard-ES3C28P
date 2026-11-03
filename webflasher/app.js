// Configure these two values to match the GitHub repository.
const OWNER = "quocvuong1105";
const REPO = "Car-Dashboard-ES3C28P";
const API = `https://api.github.com/repos/${OWNER}/${REPO}/releases`;

const releaseSelect = document.querySelector("#release");
const installer = document.querySelector("#installer");
const info = document.querySelector("#firmware-info");
const note = document.querySelector("#release-note");
let releases = [];
let selectedBoard = "ES3C28P";

function assetFor(release, board) {
  const expected = `CarCYD-${board}-merged.bin`;
  return release.assets?.find(a => a.name === expected) || null;
}
function selectedRelease() {
  return releases.find(r => r.id === Number(releaseSelect.value));
}
function setInfo(message) {
  info.querySelector("p").textContent = message;
}
function updateManifest() {
  const release = selectedRelease();
  const asset = release && assetFor(release, selectedBoard);
  if (!release || !asset) {
    installer.removeAttribute("manifest");
    setInfo(`Phiên bản đang chọn chưa có file CarCYD-${selectedBoard}-merged.bin. Chưa thể nạp bản này.`);
    return;
  }
  const manifest = {
    name: `CarCYD ${selectedBoard}`,
    version: release.tag_name || release.name,
    new_install_prompt_erase: true,
    new_install_improv_wait_time: 0,
    builds: [{
      chipFamily: "ESP32-S3",
      parts: [{ path: asset.browser_download_url, offset: 0 }]
    }]
  };
  const blob = new Blob([JSON.stringify(manifest)], {type: "application/json"});
  if (installer.dataset.manifestUrl) URL.revokeObjectURL(installer.dataset.manifestUrl);
  const manifestUrl = URL.createObjectURL(blob);
  installer.dataset.manifestUrl = manifestUrl;
  installer.setAttribute("manifest", manifestUrl);
  setInfo(`${release.name || release.tag_name} · ${selectedBoard} · ${(asset.size / 1024 / 1024).toFixed(2)} MB. Firmware đã sẵn sàng để cài đặt.`);
}
async function loadReleases() {
  try {
    const response = await fetch(API, {headers: {"Accept":"application/vnd.github+json"}});
    if (!response.ok) throw new Error(response.status === 404 ? "Không đọc được Releases. Kiểm tra repository có public và đã tạo Release." : `GitHub API trả về HTTP ${response.status}.`);
    releases = (await response.json()).filter(r => !r.draft && !r.prerelease);
    releaseSelect.innerHTML = "";
    if (!releases.length) throw new Error("Repository chưa có GitHub Release. Hãy tạo Release kèm file firmware merged trước.");
    for (const r of releases) {
      const option = document.createElement("option");
      option.value = r.id;
      option.textContent = `${r.name || r.tag_name} · ${new Date(r.published_at).toLocaleDateString("vi-VN")}`;
      releaseSelect.append(option);
    }
    releaseSelect.disabled = false;
    note.textContent = `${releases.length} phiên bản phát hành được tìm thấy. Chọn phiên bản cũ để quay về firmware trước đó.`;
    updateManifest();
  } catch (error) {
    releaseSelect.innerHTML = `<option>Chưa có phiên bản khả dụng</option>`;
    note.textContent = error.message;
    setInfo(error.message);
  }
}
document.querySelectorAll('input[name="board"]').forEach(input => {
  input.addEventListener("change", () => { selectedBoard = input.value; updateManifest(); });
});
releaseSelect.addEventListener("change", updateManifest);
loadReleases();
