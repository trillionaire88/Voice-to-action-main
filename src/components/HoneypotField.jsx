/**
 * Invisible honeypot field to catch bots.
 * Visually hidden without display:none (some bots skip display:none fields).
 */
export default function HoneypotField({ value, onChange, inputId = "website_url", name = "website_url" }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        left: "-9999px",
        top: "-9999px",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        opacity: 0,
        tabIndex: -1,
      }}
    >
      <label htmlFor={inputId}>Website URL (leave blank)</label>
      <input
        id={inputId}
        name={name}
        type="text"
        value={value}
        onChange={onChange}
        autoComplete="off"
        tabIndex={-1}
      />
    </div>
  );
}
