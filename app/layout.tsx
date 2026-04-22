import type { Metadata } from 'next'
import './styles/globals.css'

export const metadata: Metadata = {
  title: 'Pleasanton Garage Door Repair | Valiant Garage Door',
  description: 'Same-day garage door repair, spring replacement, opener repair, and emergency service in Pleasanton, Dublin, San Ramon, Livermore, and Fremont.',
  keywords: 'garage door repair pleasanton ca, garage door service pleasanton 94588, garage door fabrication pleasanton, emergency garage door repair near me, commercial garage door service pleasanton',
  openGraph: {
    title: 'Pleasanton Garage Door Repair | Valiant Garage Door',
    description: 'Same-day garage door repair, spring replacement, opener repair, and emergency service in Pleasanton, Dublin, San Ramon, Livermore, and Fremont.',
    type: 'website',
    url: 'https://www.valiantdoor.com/',
    images: [
      {
        url: 'https://www.valiantdoor.com/assets/Valiant%20HOME%20PAGE%20new%20Hero%20Background%20Final%20.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pleasanton Garage Door Repair | Valiant Garage Door',
    description: 'Same-day garage door repair, spring replacement, opener repair, and emergency service in Pleasanton, Dublin, San Ramon, Livermore, and Fremont.',
    images: [
      'https://www.valiantdoor.com/assets/Valiant%20HOME%20PAGE%20new%20Hero%20Background%20Final%20.png',
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-P8L8VN7J');`,
          }}
        />
        {/* Clarity tracking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i+"?ref=bwt";
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "vwn2y0cm2l");`,
          }}
        />
        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-K309W5D2N5"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-K309W5D2N5');
gtag('config', 'AW-17909190639');`,
          }}
        />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-P8L8VN7J"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {children}
      </body>
    </html>
  )
}
