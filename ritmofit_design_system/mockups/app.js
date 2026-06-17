const selectedTracks = () =>
  Array.from(document.querySelectorAll("[data-select-track]:checked"));

const updateSelectionTray = () => {
  const tray = document.querySelector("[data-selection-tray]");
  if (!tray) return;

  const selected = selectedTracks();
  const totalSeconds = selected.reduce(
    (total, input) => total + Number(input.dataset.duration || 0),
    0,
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");

  tray.querySelector("[data-selection-count]").textContent =
    `${selected.length} track${selected.length === 1 ? "" : "s"} selected`;
  tray.querySelector("[data-selection-duration]").textContent =
    selected.length > 0
      ? `${minutes}:${seconds} total. Start with the music; shape the room in Builder.`
      : "Select tracks to shape a new class.";

  tray.querySelectorAll("a, button").forEach((control) => {
    const isDisabled = selected.length === 0;
    if (isDisabled) {
      control.setAttribute("aria-disabled", "true");
    } else {
      control.removeAttribute("aria-disabled");
    }
    if (control instanceof HTMLButtonElement) {
      control.disabled = isDisabled;
    } else {
      control.tabIndex = isDisabled ? -1 : 0;
    }
  });

  document.querySelectorAll("[data-library-row]").forEach((row) => {
    const input = row.querySelector("[data-select-track]");
    row.classList.toggle("is-selected", Boolean(input?.checked));
  });
};

document.querySelectorAll("[data-select-track]").forEach((input) => {
  input.addEventListener("change", updateSelectionTray);
});

document.querySelectorAll("[data-zone-option]").forEach((option) => {
  option.addEventListener("click", () => {
    const group = option.closest("[data-zone-group]");
    group?.querySelectorAll("[data-zone-option]").forEach((candidate) => {
      candidate.setAttribute("aria-pressed", String(candidate === option));
    });
  });
});

document.querySelectorAll("[data-view-option]").forEach((option) => {
  option.addEventListener("click", () => {
    const group = option.closest("[data-view-group]");
    group?.querySelectorAll("[data-view-option]").forEach((candidate) => {
      const isSelected = candidate === option;
      candidate.setAttribute("aria-pressed", String(isSelected));
      // The selected look is carried by the button variant, not aria-pressed
      // alone, so swap the class to match (cyan action = selected, ghost = not).
      candidate.classList.toggle("button-action", isSelected);
      candidate.classList.toggle("button-ghost", !isSelected);
    });
  });
});

// Opt-in light-theme toggle. Flips [data-theme] on <html> so the generated
// [data-theme="light"] token block (see scripts/build-tokens.mjs) takes effect.
// Lets the otherwise-undemonstrated light palette be verified in a browser.
document.querySelectorAll("[data-theme-toggle]").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const root = document.documentElement;
    const nowLight = root.getAttribute("data-theme") !== "light";
    if (nowLight) {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    toggle.setAttribute("aria-pressed", String(nowLight));
    toggle.textContent = nowLight ? "Dark theme" : "Light theme";
  });
});

updateSelectionTray();

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const disabledLink = event.target.closest('a[aria-disabled="true"]');
  if (disabledLink) event.preventDefault();
});

// Keyboard-operable Live seek slider. The role="slider" + ARIA values were already
// present; this adds key handling (Arrow/Home/End/PageUp-Down) and reflects position
// into --seek + aria values so the control is genuinely operable, not just labelled.
const fmtTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = String(Math.round(seconds % 60)).padStart(2, "0");
  return `${m}:${s}`;
};

document.querySelectorAll("[data-seek]").forEach((seek) => {
  const total = Number(seek.dataset.seekTotal || 0);
  const readout = document.querySelector("[data-seek-readout]");
  const clamp = (n) => Math.max(0, Math.min(100, n));

  const setValue = (value) => {
    const v = clamp(value);
    seek.style.setProperty("--seek", `${v}%`);
    seek.setAttribute("aria-valuenow", String(Math.round(v)));
    if (total) {
      const elapsed = (v / 100) * total;
      seek.setAttribute(
        "aria-valuetext",
        `${fmtTime(elapsed)} of ${fmtTime(total)}`,
      );
      if (readout) readout.textContent = `${fmtTime(elapsed)} / ${fmtTime(total)}`;
    }
  };

  seek.addEventListener("keydown", (event) => {
    const current = Number(seek.getAttribute("aria-valuenow") || 0);
    const step = event.shiftKey ? 10 : event.key.startsWith("Page") ? 10 : 1;
    let next = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
      case "PageUp":
        next = current + step;
        break;
      case "ArrowLeft":
      case "ArrowDown":
      case "PageDown":
        next = current - step;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 100;
        break;
      default:
        return;
    }
    event.preventDefault();
    setValue(next);
  });
});
