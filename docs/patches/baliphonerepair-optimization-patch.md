# PATCH 1: robots.txt
File location: public/robots.txt

```txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /login

# Explicitly allow OpenAI ChatGPT Search Bot to crawl and cite web pages
User-agent: OAI-SearchBot
Allow: /

# GPTBot (training) policy can be specified according to owner preference
User-agent: GPTBot
Allow: /

Sitemap: https://baliphonerepair.com/sitemap.xml
```

---

# PATCH 2: Schema.org JSON-LD Graph for Parent Brand & 3 Verified Branches
File location: resources/views/partials/schema-branches.blade.php
Insert in: <head> section of resources/views/layouts/app.blade.php

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LocalBusiness",
      "@id": "https://baliphonerepair.com/#organization",
      "name": "Bali Phone Repair",
      "legalName": "Bali Phone Repair & Technology Care",
      "url": "https://baliphonerepair.com",
      "logo": "https://baliphonerepair.com/assets/bali-phone-repair/logo-optimized.jpg",
      "image": "https://baliphonerepair.com/assets/bali-phone-repair/logo-optimized.jpg",
      "telephone": "+6281929164999",
      "email": "hello@baliphonerepair.com",
      "priceRange": "$$",
      "description": "Professional electronics repair service in Bali specializing in iPhone, MacBook, iPad, and Android repair with certified walk-in workshops and mobile on-site villa service.",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Jl. Pulau Misol No.106, Dauh Puri Kauh",
        "addressLocality": "Denpasar",
        "addressRegion": "Bali",
        "postalCode": "80113",
        "addressCountry": "ID"
      },
      "areaServed": [
        { "@type": "AdministrativeArea", "name": "Canggu" },
        { "@type": "AdministrativeArea", "name": "Pererenan" },
        { "@type": "AdministrativeArea", "name": "Berawa" },
        { "@type": "AdministrativeArea", "name": "Seminyak" },
        { "@type": "AdministrativeArea", "name": "Kuta" },
        { "@type": "AdministrativeArea", "name": "Ubud" },
        { "@type": "AdministrativeArea", "name": "Sanur" },
        { "@type": "AdministrativeArea", "name": "Denpasar" },
        { "@type": "AdministrativeArea", "name": "Jimbaran" },
        { "@type": "AdministrativeArea", "name": "Uluwatu" },
        { "@type": "AdministrativeArea", "name": "Nusa Dua" }
      ],
      "subOrganization": [
        {
          "@type": "LocalBusiness",
          "@id": "https://baliphonerepair.com/#branch-ismart-canggu",
          "name": "iSmart Canggu",
          "alternateName": "iSmart Canggu (Branch of Bali Phone Repair)",
          "url": "https://baliphonerepair.com/branches/ismart-canggu",
          "telephone": "+6281929164999",
          "priceRange": "$$",
          "description": "iSmart Canggu is a Bali Phone Repair branch serving tourists, expats, and digital nomads in Canggu, Berawa, and Pererenan with walk-ins and mobile villa technician dispatch.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Jl. Raya Canggu, Kerobokan",
            "addressLocality": "Canggu / Kerobokan",
            "addressRegion": "Bali",
            "postalCode": "80361",
            "addressCountry": "ID"
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "opens": "09:00",
              "closes": "20:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Sunday"],
              "opens": "10:00",
              "closes": "18:00"
            }
          ]
        },
        {
          "@type": "LocalBusiness",
          "@id": "https://baliphonerepair.com/#branch-bale-bali",
          "name": "Bale Bali",
          "alternateName": "Bale Bali - Central Workshop (Bali Phone Repair)",
          "url": "https://baliphonerepair.com/branches/bale-bali",
          "telephone": "+6281929164999",
          "priceRange": "$$",
          "description": "Bale Bali is the flagship central workshop of Bali Phone Repair in Denpasar, equipped with precision micro-soldering and ultrasonic cleaning facilities.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Jl. Pulau Misol No. 106, Dauh Puri Kauh",
            "addressLocality": "Denpasar",
            "addressRegion": "Bali",
            "postalCode": "80113",
            "addressCountry": "ID"
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "opens": "09:00",
              "closes": "21:00"
            },
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Sunday"],
              "opens": "09:00",
              "closes": "18:00"
            }
          ]
        },
        {
          "@type": "LocalBusiness",
          "@id": "https://baliphonerepair.com/#branch-ismart-teuku-umar",
          "name": "iSmart Teuku Umar",
          "alternateName": "iSmart Teuku Umar (Branch of Bali Phone Repair)",
          "url": "https://baliphonerepair.com/branches/ismart-teuku-umar",
          "telephone": "+6281929164999",
          "priceRange": "$$",
          "description": "iSmart Teuku Umar is a Bali Phone Repair branch located in Denpasar's primary electronics technology and gadget corridor, specializing in laser rear glass separation and logic board repair.",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Jl. Teuku Umar No. 241, Dauh Puri Kauh",
            "addressLocality": "Denpasar Barat",
            "addressRegion": "Bali",
            "postalCode": "80113",
            "addressCountry": "ID"
          },
          "openingHoursSpecification": [
            {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              "opens": "09:00",
              "closes": "21:00"
            }
          ]
        }
      ]
    }
  ]
}
</script>
```

---

# PATCH 3: Verified Branches Footer & Contact Blade Partial
File location: resources/views/partials/branches-footer.blade.php
Include in: resources/views/layouts/app.blade.php right before <footer>

```html
<section class="bpr-branches-section" style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; padding: 3rem 0;">
  <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 1.5rem;">
    <div style="text-align: center; margin-bottom: 2rem;">
      <h2 style="font-size: 1.75rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">
        Our Verified Workshops & Service Branches in Bali
      </h2>
      <p style="color: #64748b; font-size: 0.95rem; max-width: 700px; margin: 0 auto;">
        Bali Phone Repair operates physical walk-in workshops and mobile technician dispatch across South Bali. Visit our branches or book an on-site villa service.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
      <!-- iSmart Canggu -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0;">📍 iSmart Canggu</h3>
          <span style="font-size: 0.75rem; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 0.2rem 0.6rem; border-radius: 999px;">Canggu Hub</span>
        </div>
        <p style="color: #334155; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem;">
          Jl. Raya Canggu, Kerobokan, Badung, Bali
        </p>
        <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
          <strong>iSmart Canggu is a Bali Phone Repair branch</strong> conveniently positioned for tourists, expats, and digital nomads in Canggu, Berawa, Batu Bolong, and Pererenan. Walk-ins welcome for express same-day repairs or schedule an in-villa technician visit.
        </p>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.4rem;">
          ⏰ <strong>Hours:</strong> Mon–Sat: 09:00–20:00 | Sun: 10:00–18:00
        </div>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 1rem;">
          🛵 <strong>Service:</strong> Walk-in Workshop • In-Villa Service • Courier Pickup
        </div>
        <a href="https://wa.me/6281929164999?text=Hi%20iSmart%20Canggu%2C%20I%20need%20repair%20assistance" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600;">
          Chat with Canggu Branch
        </a>
      </div>

      <!-- Bale Bali -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0;">📍 Bale Bali</h3>
          <span style="font-size: 0.75rem; font-weight: 600; color: #16a34a; background: #f0fdf4; padding: 0.2rem 0.6rem; border-radius: 999px;">Central Lab</span>
        </div>
        <p style="color: #334155; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem;">
          Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113
        </p>
        <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
          <strong>Bale Bali is the flagship central workshop of Bali Phone Repair</strong>, housing high-grade diagnostic benches, ultrasonic liquid damage restoration tanks, and extensive spare parts stock for iPhones, MacBooks, and Android flagships.
        </p>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.4rem;">
          ⏰ <strong>Hours:</strong> Mon–Sat: 09:00–21:00 | Sun: 09:00–18:00
        </div>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 1rem;">
          🛵 <strong>Service:</strong> Walk-in Workshop • Advanced Diagnostics • Device Rental
        </div>
        <a href="https://wa.me/6281929164999?text=Hi%20Bale%20Bali%20Workshop%2C%20I%20have%20a%20device%20repair%20inquiry" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600;">
          Chat with Central Lab
        </a>
      </div>

      <!-- iSmart Teuku Umar -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem; font-weight: 700; color: #0f172a; margin: 0;">📍 iSmart Teuku Umar</h3>
          <span style="font-size: 0.75rem; font-weight: 600; color: #9333ea; background: #faf5ff; padding: 0.2rem 0.6rem; border-radius: 999px;">Tech Corridor</span>
        </div>
        <p style="color: #334155; font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem;">
          Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali
        </p>
        <p style="color: #64748b; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem;">
          <strong>iSmart Teuku Umar is a Bali Phone Repair branch</strong> in Bali’s premier tech street. Specializing in precision logic board micro-soldering, back glass laser separation, and iPad screen laminating.
        </p>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.4rem;">
          ⏰ <strong>Hours:</strong> Mon–Sat: 09:00–21:00
        </div>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 1rem;">
          🛵 <strong>Service:</strong> Walk-in Workshop • Board Micro-Soldering • Laser Glass
        </div>
        <a href="https://wa.me/6281929164999?text=Hi%20iSmart%20Teuku%20Umar%2C%20I%20need%20board%20or%20screen%20repair" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 0.5rem 1rem; border-radius: 6px; text-decoration: none; font-size: 0.85rem; font-weight: 600;">
          Chat with Teuku Umar Branch
        </a>
      </div>
    </div>
  </div>
</section>
```

---

# PATCH 4: Dedicated English Branch Page for iSmart Canggu
File location: resources/views/branches/ismart-canggu.blade.php
Route in routes/web.php: `Route::get('/branches/ismart-canggu', [BranchController::class, 'canggu']);`

```html
@extends('layouts.app')

@section('title', 'iSmart Canggu - Phone, iPhone & MacBook Repair in Canggu Bali')
@section('meta_description', 'iSmart Canggu is a Bali Phone Repair branch serving Canggu, Berawa, and Pererenan. Same-day iPhone screen fix, MacBook repair, and villa technician service.')

@section('content')
<div class="container" style="max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem;">
  <nav style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
    <a href="/" style="color: #2563eb; text-decoration: none;">Home</a> &raquo;
    <a href="/service-areas" style="color: #2563eb; text-decoration: none;">Service Areas</a> &raquo;
    <span>iSmart Canggu</span>
  </nav>

  <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
    Phone & Laptop Repair in Canggu: iSmart Canggu
  </h1>

  <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">
    <strong>iSmart Canggu is a Bali Phone Repair branch</strong> located at Jalan Raya Canggu. We provide digital nomads, expatriates, and holiday travelers across Canggu, Berawa, Batu Bolong, and Pererenan with fast, certified gadget repairs, walk-in diagnostic evaluations, and on-site villa call-outs.
  </p>

  <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 1.25rem; border-radius: 0 8px 8px 0; margin-bottom: 2rem;">
    <h3 style="font-size: 1rem; font-weight: 700; color: #1e3a8a; margin-bottom: 0.3rem;">⚡ Need Emergency Same-Day Repair in Canggu?</h3>
    <p style="color: #1e40af; font-size: 0.9rem; margin-bottom: 0.5rem;">
      Whether your iPhone screen cracked at Echo Beach, your laptop suffered a liquid spill at a coworking space, or your charging port is blocked with volcanic sand, our technicians are ready.
    </p>
    <a href="https://wa.me/6281929164999?text=Hi%20iSmart%20Canggu%2C%20I%20need%20repair%20service%20in%20Canggu" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
      WhatsApp Booking: +62 819-2916-4999
    </a>
  </div>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    Services Available at our Canggu Branch
  </h2>

  <ul style="color: #334155; line-height: 1.8; margin-bottom: 2rem; padding-left: 1.25rem;">
    <li><strong>iPhone Screen Replacement:</strong> High-grade OEM and original OLED panels installed within 30–45 minutes.</li>
    <li><strong>Battery Replacement:</strong> High-cycle battery swaps with genuine battery health calibration before international flights.</li>
    <li><strong>MacBook & Laptop Servicing:</strong> Keyboard replacement, thermal throttling cleaning, fan repairs, and battery replacements.</li>
    <li><strong>Samsung & Android Fixes:</strong> Galaxy S23/S24 Ultra, Pixel, and Xiaomi AMOLED display and charging port restorations.</li>
    <li><strong>Liquid & Saltwater Treatment:</strong> First-response drying and ultrasonic cleaning to neutralize tropical beach saltwater corrosion.</li>
    <li><strong>In-Villa Technician Service:</strong> Convenient on-site repairs at your villa in Canggu, Berawa, Pererenan, or Seminyak.</li>
  </ul>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    Branch Details & Location
  </h2>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
    <p style="margin-bottom: 0.5rem;"><strong>Branch Name:</strong> iSmart Canggu (Bali Phone Repair Branch)</p>
    <p style="margin-bottom: 0.5rem;"><strong>Physical Address:</strong> Jl. Raya Canggu, Kerobokan, Badung, Bali</p>
    <p style="margin-bottom: 0.5rem;"><strong>Phone / WhatsApp:</strong> +62 819-2916-4999</p>
    <p style="margin-bottom: 0.5rem;"><strong>Operating Hours:</strong> Monday – Saturday: 09:00 – 20:00 | Sunday: 10:00 – 18:00</p>
    <p style="margin-bottom: 0.5rem;"><strong>Neighborhoods Covered:</strong> Canggu, Pantai Berawa, Batu Bolong, Echo Beach, Pererenan, Seseh, Kerobokan, Umalas</p>
  </div>
</div>
@endsection
```

---

# PATCH 5: Service Page Content Enhancement: MacBook Repair Bali
File location: resources/views/services/macbook-repair-bali.blade.php

```html
@extends('layouts.app')

@section('title', 'MacBook Repair Bali - Apple Mac Screen, Battery & Logic Board Specialists')
@section('meta_description', 'Professional MacBook repair in Bali by Bali Phone Repair & Bale Bali workshop. Screen replacements, battery swap, liquid spill ultrasonic cleaning, and logic board micro-soldering with warranty.')

@section('content')
<div class="container" style="max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem;">
  <nav style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
    <a href="/" style="color: #2563eb; text-decoration: none;">Home</a> &raquo;
    <a href="/services" style="color: #2563eb; text-decoration: none;">Services</a> &raquo;
    <span>MacBook Repair Bali</span>
  </nav>

  <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
    MacBook Repair in Bali: Expert Mac Diagnosticians & Hardware Lab
  </h1>

  <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">
    Bali Phone Repair, together with our central diagnostic workshop <strong>Bale Bali (Denpasar)</strong> and satellite branches at <strong>iSmart Canggu</strong> and <strong>iSmart Teuku Umar</strong>, offers component-level hardware repair for Apple MacBooks across Bali. We cater specifically to digital nomads, creative professionals, and remote workers who require fast, reliable turnaround times.
  </p>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem;">
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; background: #ffffff;">
      <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.5rem;">🖥️ Retina & Liquid Retina Displays</h3>
      <p style="font-size: 0.9rem; color: #64748b;">Assembly replacements for MacBook Air (M1, M2, M3) and MacBook Pro (13", 14", 16"). Fixing cracked panels, stage lighting flex cable faults, and blank display syndromes.</p>
    </div>
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; background: #ffffff;">
      <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.5rem;">🔋 Battery Degradation & Swelling</h3>
      <p style="font-size: 0.9rem; color: #64748b;">Genuine-spec OEM high-capacity battery replacements. Critical for avoiding trackpad lift and ensuring travel safety on departing flights.</p>
    </div>
    <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; background: #ffffff;">
      <h3 style="font-size: 1.1rem; color: #0f172a; margin-bottom: 0.5rem;">💧 Liquid & Coffee Spill Cleanout</h3>
      <p style="font-size: 0.9rem; color: #64748b;">Immediate ultrasonic motherboard cleansing and power-rail IC micro-soldering at Bale Bali workshop to stop corrosive oxidation.</p>
    </div>
  </div>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    How to Get Your MacBook Serviced
  </h2>
  <ul style="color: #334155; line-height: 1.8; margin-bottom: 2rem; padding-left: 1.25rem;">
    <li><strong>Walk-in Diagnostic:</strong> Visit <em>iSmart Canggu</em> (Jl. Raya Canggu) for quick intake and express repairs, or <em>Bale Bali</em> (Jl. Pulau Misol 106 Denpasar) for deep logic board inspection.</li>
    <li><strong>Villa / Hotel Courier Pickup:</strong> Staying in Canggu, Pererenan, Seminyak, or Ubud? Our courier team picks up your device with a secure intake receipt and delivers it back once tested.</li>
  </ul>
</div>
@endsection
```

---

# PATCH 6: Service Page Content Enhancement: Android & Samsung Repair Bali
File location: resources/views/services/android-repair-bali.blade.php

```html
@extends('layouts.app')

@section('title', 'Samsung & Android Repair Bali - Galaxy, Pixel & Xiaomi Service')
@section('meta_description', 'Certified Samsung Galaxy, Google Pixel, and Android phone repair in Bali. Fast screen replacement, battery swap, and charging port repairs at iSmart Canggu and Bali Phone Repair.')

@section('content')
<div class="container" style="max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem;">
  <nav style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
    <a href="/" style="color: #2563eb; text-decoration: none;">Home</a> &raquo;
    <a href="/services" style="color: #2563eb; text-decoration: none;">Services</a> &raquo;
    <span>Android & Samsung Repair Bali</span>
  </nav>

  <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
    Samsung & Android Repair in Bali: Galaxy, Pixel & OnePlus Specialists
  </h1>

  <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">
    Looking for a reliable Samsung or Android repair center while in Bali? <strong>Bali Phone Repair</strong> and our dedicated branches (<strong>iSmart Canggu</strong>, <strong>Bale Bali</strong>, and <strong>iSmart Teuku Umar</strong>) service the full range of Android flagship devices with high-precision tools and premium parts.
  </p>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    Supported Android Brands & Series
  </h2>
  <ul style="color: #334155; line-height: 1.8; margin-bottom: 2rem; padding-left: 1.25rem;">
    <li><strong>Samsung Galaxy:</strong> S24 Ultra, S23, S22, S21 series, Note series, and Galaxy Z Fold & Z Flip hinge/screen replacements.</li>
    <li><strong>Google Pixel:</strong> Pixel 9, 8 Pro, 7a, 6, and older models display and USB-C port repairs.</li>
    <li><strong>Xiaomi & OnePlus:</strong> Flagship AMOLED screens, battery degradation restoration, and camera lens replacements.</li>
  </ul>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    Service Options & Turnaround Time
  </h2>
  <p style="color: #475569; line-height: 1.6; margin-bottom: 1.5rem;">
    Most standard Android screen and battery replacements take <strong>45 to 90 minutes</strong> when parts are in stock. Walk-in at <em>iSmart Canggu</em> or book mobile technician pickup directly to your villa in Canggu, Berawa, Pererenan, or Seminyak.
  </p>
</div>
@endsection
```

---

# PATCH 7: Mobile On-Site Villa Technician Service Page
File location: resources/views/services/villa-hotel-service.blade.php
Route in routes/web.php: `Route::get('/services/villa-hotel-service', [ServiceController::class, 'villaService']);`

```html
@extends('layouts.app')

@section('title', 'Mobile iPhone & Phone Repair to Your Villa in Canggu Bali')
@section('meta_description', 'Need an iPhone or phone repair technician to come directly to your villa in Canggu, Seminyak, or Pererenan? Bali Phone Repair dispatches mobile technicians for on-site repairs.')

@section('content')
<div class="container" style="max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem;">
  <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
    Mobile Villa & Hotel Phone Repair Service in Canggu & Bali
  </h1>

  <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">
    Don't let a cracked screen ruin your holiday or disrupt your remote workday. <strong>Bali Phone Repair</strong> dispatches professional repair technicians directly to your private villa, resort, or coworking space across <strong>Canggu, Berawa, Pererenan, Umalas, and Seminyak</strong>.
  </p>

  <h2 style="font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 1rem;">
    Repairs Handled On-Site at Your Villa
  </h2>
  <ul style="color: #334155; line-height: 1.8; margin-bottom: 2rem; padding-left: 1.25rem;">
    <li><strong>iPhone Screen Replacement:</strong> Completed in 30 minutes right on your dining or poolside table.</li>
    <li><strong>Battery Replacement:</strong> Quick swap with diagnostic battery health verification.</li>
    <li><strong>Charging Port & Speaker Cleaning:</strong> Removal of beach sand and debris.</li>
  </ul>

  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 1.5rem;">
    <h3 style="font-size: 1.1rem; color: #166534; margin-bottom: 0.5rem;">📲 How to Book a Villa Technician</h3>
    <p style="color: #14532d; margin-bottom: 1rem;">
      Send your location pin, device model, and issue to our dispatch desk via WhatsApp. A technician from our nearest hub (iSmart Canggu) will arrive within 60–90 minutes.
    </p>
    <a href="https://wa.me/6281929164999?text=Hi%2C%20I%20would%20like%20to%20book%20a%20technician%20to%20my%20villa%20in%20Canggu" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 600;">
      Book Villa Technician on WhatsApp
    </a>
  </div>
</div>
@endsection
```

---

# PATCH 8: Homepage Hero Dual Authority (Walk-in Workshops s/d 22:00 + Villa Mobile Repair)
File location: resources/views/partials/hero-dual-authority.blade.php
Insert in: resources/views/welcome.blade.php (Hero Section)

```html
<!-- DUAL AUTHORITY HERO SECTION: SOLVES CHATGPT "ALTERNATIVE ONLY" MISCLASSIFICATION -->
<div class="bpr-hero-announcement" style="background: #0f172a; color: #f8fafc; padding: 0.75rem 1.5rem; text-align: center; border-bottom: 2px solid #2563eb;">
  <span style="display: inline-block; background: #16a34a; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; margin-right: 0.5rem;">
    OPEN TODAY
  </span>
  <span style="font-size: 0.9rem; font-weight: 500;">
    🏬 <strong>Walk-in Workshops Open Today until 21:00 / 22:00</strong> (Jl. Teuku Umar & Denpasar) &bull; 🛵 <strong>Mobile Villa Service</strong> (Canggu & Seminyak)
  </span>
</div>

<div class="hero-dual-cta" style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem;">
  <a href="#workshops" style="background: #2563eb; color: #fff; padding: 0.85rem 1.75rem; border-radius: 8px; font-weight: 700; text-decoration: none;">
    📍 Visit Walk-in Workshop (Teuku Umar / Denpasar / Canggu)
  </a>
  <a href="/services/villa-hotel-service" style="background: #1e293b; color: #38bdf8; border: 1px solid #38bdf8; padding: 0.85rem 1.75rem; border-radius: 8px; font-weight: 700; text-decoration: none;">
    🛵 Book On-Site Villa Technician
  </a>
</div>
```

---

# PATCH 9: Dedicated Landing Page for iSmart Teuku Umar (Jl. Teuku Umar No. 241)
File location: resources/views/branches/ismart-teuku-umar.blade.php
Route in routes/web.php: `Route::get('/branches/ismart-teuku-umar', [BranchController::class, 'teukuUmar']);`

```html
@extends('layouts.app')

@section('title', 'iSmart Teuku Umar - Phone, iPhone & Motherboard Repair Jl. Teuku Umar Denpasar')
@section('meta_description', 'iSmart Teuku Umar is a Bali Phone Repair branch located in Denpasar tech strip (Jl. Teuku Umar No. 241). Express walk-in iPhone screen, battery, and logic board micro-soldering open today.')

@section('content')
<div class="container" style="max-width: 1000px; margin: 3rem auto; padding: 0 1.5rem;">
  <nav style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
    <a href="/" style="color: #2563eb; text-decoration: none;">Home</a> &raquo;
    <a href="/branches" style="color: #2563eb; text-decoration: none;">Branches</a> &raquo;
    <span>iSmart Teuku Umar</span>
  </nav>

  <h1 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.75rem;">
    iSmart Teuku Umar: Bali Phone Repair Workshop in Denpasar Gadget Center
  </h1>

  <p style="font-size: 1.1rem; color: #475569; line-height: 1.6; margin-bottom: 2rem;">
    <strong>iSmart Teuku Umar is a Bali Phone Repair branch</strong> conveniently located right on <strong>Jalan Teuku Umar No. 241, Denpasar</strong> — Bali's most famous tech and smartphone shopping corridor. We provide fast walk-in diagnostic evaluations, display replacements, laser glass separation, and advanced motherboard micro-soldering.
  </p>

  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem;">
    <h3 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">🏬 Branch Overview</h3>
    <ul style="color: #334155; line-height: 1.8; margin-bottom: 1rem;">
      <li><strong>Address:</strong> Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali 80113</li>
      <li><strong>Hours:</strong> Monday – Saturday: 09:00 – 21:00 / 22:00</li>
      <li><strong>Specialties:</strong> iPhone & iPad screen replacement, logic board IC reballing, laser back glass restoration, and Samsung AMOLED display renewal.</li>
      <li><strong>Walk-in Service:</strong> No appointment necessary. Express repairs completed in 30–60 minutes.</li>
    </ul>
    <a href="https://wa.me/6281929164999?text=Hi%20iSmart%20Teuku%20Umar%2C%20I%20need%20repair%20assistance" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 0.6rem 1.2rem; border-radius: 6px; text-decoration: none; font-weight: 600;">
      WhatsApp iSmart Teuku Umar: +62 819-2916-4999
    </a>
  </div>
</div>
@endsection
```


