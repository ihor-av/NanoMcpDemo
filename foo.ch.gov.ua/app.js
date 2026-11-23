async function loadAnnouncements() {
  const response = await fetch("/api/announcements");
  const data = await response.json();
  const list = document.querySelector("#announcements");
  list.textContent = "";

  for (const announcement of data.data) {
    const item = document.createElement("li");
    item.textContent = announcement.published_at + " — " + announcement.name;
    list.append(item);
  }
}

loadAnnouncements().catch(() => {
  document.querySelector("#announcements").textContent = "Не вдалося завантажити оголошення.";
});
