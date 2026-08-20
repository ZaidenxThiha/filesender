const SMARTLINK_URL =
  "https://elseconcerning.com/vxmi9efju8?key=63a5feb400e838f6adcde847d4517e13";

const BANNER_OPTIONS = `atOptions = {
  'key' : 'efc635935a723faae0771e7266793057',
  'format' : 'iframe',
  'height' : 300,
  'width' : 160,
  'params' : {}
};`;

export function AdSlots() {
  return (
    <aside className="ad-slots" aria-label="Advertisement">
      <div
        id="container-a6ce759d2c8fd02ae30424dfc026d840"
        className="ad-native-slot"
      />

      <div className="ad-banner-slot">
        <script dangerouslySetInnerHTML={{ __html: BANNER_OPTIONS }} />
        <script src="https://www.highperformanceformat.com/efc635935a723faae0771e7266793057/invoke.js" />
      </div>

      <a
        className="ad-smartlink-slot"
        href={SMARTLINK_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        View sponsored offers
      </a>
    </aside>
  );
}
