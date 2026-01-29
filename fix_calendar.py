
import os

target_file = r"C:\xampp\htdocs\property-custodian\User_Custodians\event_reservations_calendar.php"

content = r'''<?php
session_start();
require_once '../connection.php';

// Fetch events with reservations from event_asset_reservations table
$events = [];

try {
    $query = "
        SELECT
            e.id as event_id,
            e.name as event_title,
            e.start_datetime,
            e.end_datetime,
            e.venue,
            COUNT(r.asset_id) as item_count,
            SUM(CASE WHEN r.status = 'Reserved' THEN 1 ELSE 0 END) as reserved_count,
            SUM(CASE WHEN r.status = 'Issued' THEN 1 ELSE 0 END) as issued_count
        FROM school_event_management.events e
        INNER JOIN event_asset_reservations r ON e.id = r.event_id
        WHERE e.deleted_at IS NULL
        GROUP BY e.id, e.name, e.start_datetime, e.end_datetime, e.venue
        ORDER BY e.start_datetime ASC
    ";

    $result = $conn->query($query);

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $status = ($row['reserved_count'] > 0) ? 'Reserved' : 'Issued';
            $colorClass = ($status === 'Reserved') ? 'bg-blue-500' : 'bg-green-500';

            $events[] = [
                'id' => $row['event_id'],
                'title' => $row['event_title'],
                'start' => $row['start_datetime'],
                'end' => $row['end_datetime'],
                'venue' => $row['venue'],
                'item_count' => $row['item_count'],
                'status' => $status,
                'colorClass' => $colorClass
            ];
        }
    }
} catch (Exception $e) {
    error_log("Calendar query error: " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta content="width=device-width, initial-scale=1.0" name="viewport">
  <title>Event Reservations Calendar</title>
  <link href="../assets/img/bagong_silang_logo.png" rel="icon">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link href="../assets/vendor/bootstrap/css/bootstrap.min.css" rel="stylesheet">
  <link href="../assets/vendor/bootstrap-icons/bootstrap-icons.css" rel="stylesheet">
  <link href="../assets/vendor/boxicons/css/boxicons.min.css" rel="stylesheet">
  <link href="../assets/css/style.css" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <?php include "../components/nav-bar.php"; ?>

  <main id="main" class="main p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-800">Event Reservations Calendar</h1>
        <nav class="flex opacity-75 text-sm mt-1">
          <ol class="flex space-x-2">
            <li><a href="dashboard_custodians.php" class="text-gray-500 hover:text-blue-600">Home</a></li>     
            <li class="text-gray-400">/</li>
            <li class="text-gray-800 font-medium">Calendar</li>
          </ol>
        </nav>
      </div>
      <div class="flex gap-2">
        <button onclick="changeMonth(-1)" class="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50">       
          <i class="bi bi-chevron-left"></i>
        </button>
        <span id="monthYear" class="px-4 py-2 bg-white border rounded-lg font-semibold"></span>
        <button onclick="changeMonth(1)" class="px-3 py-2 bg-white border rounded-lg hover:bg-gray-50">        
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Info Box -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div class="flex items-start gap-3">
        <i class="bi bi-info-circle text-blue-600 text-xl"></i>
        <div class="flex-1">
          <p class="text-sm font-medium text-blue-900">Found <?php echo count($events); ?> events with reserved equipment</p>
          <p class="text-xs text-blue-700 mt-1">
            To see events here, go to <strong>Resource Fulfillment</strong> in the Event Management system and reserve items for events.
          </p>
        </div>
      </div>
    </div>

    <!-- Calendar Grid -->
    <div class="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <div id="calendar" class="grid grid-cols-7 gap-2"></div>
    </div>

    <!-- Event Manifest Modal -->
    <div id="manifestModal" class="hidden fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div class="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <h3 id="modalTitle" class="text-lg font-bold text-gray-800"></h3>
            <p id="modalSubtitle" class="text-sm text-gray-500"></p>
          </div>
          <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600">
            <i class="bi bi-x-lg text-xl"></i>
          </button>
        </div>

        <div class="p-4 flex-1 overflow-y-auto">
          <h4 class="font-bold text-xs uppercase text-gray-500 mb-3">Item Manifest</h4>
          <div id="manifestContent" class="space-y-2"></div>
        </div>

        <div class="p-4 bg-gray-50 border-t flex justify-end gap-3 rounded-b-xl">
          <button onclick="closeModal()" class="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">
            Close
          </button>
          <button id="issueBtn" onclick="confirmIssuance()" class="px-6 py-2 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700 flex items-center gap-2">
            <i class="bi bi-check2-circle"></i>
            CONFIRM ISSUANCE
          </button>
        </div>
      </div>
    </div>
  </main>

  <script>
    const events = <?php echo json_encode($events); ?>;
    console.log("Loaded events:", events);
    let currentDate = new Date();
    let selectedEvent = null;

    function renderCalendar() {
      const calendar = document.getElementById("calendar");
      const monthYear = document.getElementById("monthYear");
      calendar.innerHTML = "";

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const monthNames = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];
      monthYear.textContent = `${monthNames[month]} ${year}`;

      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      weekdays.forEach(day => {
        const div = document.createElement("div");
        div.className = "text-center font-bold text-gray-500 text-sm py-2";
        div.textContent = day;
        calendar.appendChild(div);
      });

      for (let i = 0; i < firstDay; i++) {
        calendar.appendChild(document.createElement("div"));
      }

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayEvents = events.filter(e => e.start.startsWith(dateStr));

        const div = document.createElement("div");
        div.className = "min-h-[100px] p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition";

        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
        const dayLabel = document.createElement("div");
        dayLabel.className = `text-sm font-bold mb-1 ${isToday ? "text-blue-600" : "text-gray-400"}`;
        dayLabel.textContent = day;
        div.appendChild(dayLabel);

        dayEvents.forEach(event => {
          const eventDiv = document.createElement("div");
          eventDiv.className = `text-xs px-2 py-1 rounded border cursor-pointer hover:opacity-80 mb-1 ${event.colorClass} text-white`;
          eventDiv.innerHTML = `
            <div class="font-bold truncate">${event.title}</div>
            <div class="flex justify-between text-[10px] mt-0.5">
              <span>${event.item_count} Items</span>
              <span class="uppercase">${event.status}</span>
            </div>
          `;
          eventDiv.onclick = () => openManifest(event);
          div.appendChild(eventDiv);
        });

        calendar.appendChild(div);
      }
    }

    function changeMonth(delta) {
      currentDate.setMonth(currentDate.getMonth() + delta);
      renderCalendar();
    }

    function openManifest(event) {
      console.log("[DEBUG] openManifest called for event:", event);
      selectedEvent = event;
      
      const modal = document.getElementById("manifestModal");
      const title = document.getElementById("modalTitle");
      const subtitle = document.getElementById("modalSubtitle");
      const content = document.getElementById("manifestContent");

      modal.classList.remove("hidden");
      title.textContent = event.title;
      const eventDate = new Date(event.start).toLocaleDateString();
      subtitle.textContent = `${eventDate} at ${event.venue}`;
      content.innerHTML = "<div class='flex justify-center py-8'><span class='animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent'></span></div>";

      const url = `fetch_event_manifest.php?event_id=${event.id}`;
      console.log("[DEBUG] Fetching manifest:", url);
      fetch(url)
        .then(res => {
          if (!res.ok) {
             throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
          }
          return res.text();
        })
        .then(text => {
             console.log("[DEBUG] Raw response:", text);
             try {
                return JSON.parse(text);
             } catch (e) {
                console.error("JSON Parse Error:", e);
                const errMsg = text.length > 200 ? text.substring(0, 200) + "..." : text;
                throw new Error("Server returned invalid JSON: " + errMsg.replace(/<[^>]*>/g, ""));
             }
        })
        .then(data => {
          console.log("[DEBUG] Parsed data:", data);
          content.innerHTML = "";

          if (!Array.isArray(data) || data.length === 0) {
            content.innerHTML = "<div class='text-center py-8 text-gray-500 flex flex-col items-center'><i class='bi bi-box-seam text-4xl mb-2 opacity-20'></i><p>No reserved items found.</p></div>";
            return;
          }

          const grouped = {};
          data.forEach(item => {
            const key = item.item_name + "||" + item.category;
            if (!grouped[key]) {
              grouped[key] = {
                name: item.item_name,
                category: item.category,
                items: []
              };
            }
            grouped[key].items.push(item);
          });

          let rowsHtml = "";
          Object.values(grouped).forEach(group => {
              const count = group.items.length;
              let tagsHtml = "";
              group.items.forEach(item => {
                  const colorClass = item.status === "Issued" ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-600";
                  tagsHtml += `<span class='px-1.5 py-0.5 rounded border text-[10px] font-mono ${colorClass}'>${item.property_tag}</span> `;
              });

              rowsHtml += `
                <tr class='hover:bg-gray-50 align-top'>
                  <td class='px-3 py-2 font-medium'>${group.name}</td>
                  <td class='px-3 py-2 text-gray-500'>${group.category}</td>
                  <td class='px-3 py-2 text-center font-bold text-blue-600'>${count}</td>
                  <td class='px-3 py-2'>
                    <div class='flex flex-wrap gap-1'>
                      ${tagsHtml}
                    </div>
                  </td>
                </tr>
              `;
          });

          const table = document.createElement("table");
          table.className = "w-full text-sm";
          table.innerHTML = `
            <thead class='bg-gray-50 text-xs text-gray-500 uppercase'>
              <tr>
                <th class='px-3 py-2 text-left'>Item Name</th>
                <th class='px-3 py-2 text-left'>Category</th>
                <th class='px-3 py-2 text-center'>Qty</th>
                <th class='px-3 py-2 text-left'>Barcodes / Assets</th>
              </tr>
            </thead>
            <tbody class='divide-y'>
              ${rowsHtml}
            </tbody>
          `;
          content.appendChild(table);

          const issueBtn = document.getElementById("issueBtn");
          if (issueBtn) {
              issueBtn.style.display = event.status === "Issued" ? "none" : "flex";
          }
        })
        .catch(err => {
            console.error("[DEBUG] openManifest Error:", err);
            content.innerHTML = `<div class='p-4 bg-red-50 text-red-700 rounded border border-red-200'>
                <strong>Error loading items:</strong><br>${err.message}
            </div>`;
        });
    }

    function closeModal() {
      document.getElementById("manifestModal").classList.add("hidden");
      selectedEvent = null;
    }

    function confirmIssuance() {
      if (!selectedEvent) return;
      
      const confirmMsg = `Are you sure you want to ISSUE ${selectedEvent.item_count} items for "${selectedEvent.title}"?`;
      if (!confirm(confirmMsg)) return;

      const btn = document.getElementById("issueBtn");
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = "<span class='inline-block animate-spin mr-2 border-2 border-white border-t-transparent rounded-full w-4 h-4'></span> Processing...";

      console.log("Sending issuance request for event:", selectedEvent.id);

      fetch("process_event_issuance.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: selectedEvent.id })
      })
      .then(res => {
          if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.text().then(text => {
             try {
                 return JSON.parse(text);
             } catch (e) {
                 console.error("Server returned invalid JSON:", text);
                 throw new Error("Server returned invalid JSON response: " + text.substring(0, 50));
             }
          });
      })
      .then(data => {
        if (data.success) {
          alert("Items issued successfully!");
          location.reload();
        } else {
          alert("Failed: " + data.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      })
      .catch(error => {
          console.error("Issuance error:", error);
          alert("An error occurred: " + error.message);
          btn.disabled = false;
          btn.innerHTML = originalText;
      });
    }

    renderCalendar();
  </script>
  <script src="../assets/vendor/bootstrap/js/bootstrap.bundle.min.js"></script>
  <script src="../assets/js/main.js"></script>
</body>
</html>'''

with open(target_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("File updated successfully.")
