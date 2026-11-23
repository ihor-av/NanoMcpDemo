async function loadAnnouncements() {
  const response = await fetch("/api/announcements");
  const data = await response.json();
  const list = document.querySelector("#announcements");
  list.textContent = "";

  for (const announcement of data.items) {
    const item = document.createElement("li");
    item.textContent = announcement.date + " — " + announcement.title;
    list.append(item);
  }
}

loadAnnouncements().catch(() => {
  document.querySelector("#announcements").textContent = "Не вдалося завантажити оголошення.";
});
