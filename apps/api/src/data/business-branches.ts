/**
 * Central Verified Business & Branch Knowledge Graph
 * Brand: Bali Phone Repair
 * Branches: Bale Bali, iSmart Canggu, iSmart Teuku Umar
 */

export interface BranchInfo {
  branchCode: string
  branchName: string
  relationshipEn: string
  address: string
  district: string
  city: string
  postalCode: string
  areaServed: string[]
  phone: string
  whatsapp: string
  email: string
  openingHours: string[]
  openingHoursSpecification: Array<{
    dayOfWeek: string[]
    opens: string
    closes: string
  }>
  googleMapsUrl?: string
  pageUrl: string
  isWalkInWorkshop: boolean
  hasOnSiteVillaService: boolean
  hasCourierPickup: boolean
  servicesOffered: string[]
  notesEn: string
}

export const MAIN_BRAND_INFO = {
  name: 'Bali Phone Repair',
  legalName: 'Bali Phone Repair & Technology Care',
  domain: 'baliphonerepair.com',
  website: 'https://baliphonerepair.com',
  mainPhone: '+6281929164999',
  formattedPhone: '+62 819-2916-4999',
  email: 'hello@baliphonerepair.com',
  headOfficeAddress: 'Jl. Pulau Misol No.106, Dauh Puri Kauh, Denpasar, Bali 80113',
  logoUrl: 'https://baliphonerepair.com/assets/bali-phone-repair/logo-optimized.jpg',
  serviceAreas: [
    'Canggu',
    'Pererenan',
    'Berawa',
    'Seminyak',
    'Kuta',
    'Ubud',
    'Sanur',
    'Denpasar',
    'Jimbaran',
    'Uluwatu',
    'Nusa Dua'
  ],
  verifiedBranches: [
    {
      branchCode: 'BALE_BALI',
      branchName: 'Bale Bali',
      relationshipEn: 'Bale Bali is a central workshop and flagship branch of Bali Phone Repair.',
      address: 'Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113',
      district: 'Denpasar Barat',
      city: 'Denpasar',
      postalCode: '80113',
      areaServed: ['Denpasar', 'Sanur', 'Kuta', 'Jimbaran', 'Ubud'],
      phone: '+6281929164999',
      whatsapp: '+6281929164999',
      email: 'hello@baliphonerepair.com',
      openingHours: ['Mo-Sa 09:00-21:00', 'Su 09:00-18:00'],
      openingHoursSpecification: [
        { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '21:00' },
        { dayOfWeek: ['Sunday'], opens: '09:00', closes: '18:00' }
      ],
      googleMapsUrl: 'https://maps.google.com/?q=Bali+Phone+Repair+Jl+Pulau+Misol+106+Denpasar',
      pageUrl: 'https://baliphonerepair.com/branches/bale-bali',
      isWalkInWorkshop: true,
      hasOnSiteVillaService: true,
      hasCourierPickup: true,
      servicesOffered: [
        'iPhone Screen & OLED Display Replacement',
        'MacBook Logic Board Diagnostic & Repair',
        'Samsung Galaxy & Android AMOLED Screen Replacement',
        'Saltwater & Liquid Damage Ultrasonic Recovery',
        'Emergency NVMe SSD & Phone Data Recovery',
        'MacBook Rental Services'
      ],
      notesEn: 'Main central laboratory equipped with ultrasonic cleaning baths, microscopes, and high-capacity battery calibration benches.'
    },
    {
      branchCode: 'ISMART_CANGGU',
      branchName: 'iSmart Canggu',
      relationshipEn: 'iSmart Canggu is a Bali Phone Repair branch serving tourists, expats, and digital nomads in the Canggu, Berawa, and Pererenan hubs.',
      address: 'Jl. Raya Canggu, Kerobokan, Badung, Bali',
      district: 'Canggu / Kerobokan',
      city: 'Badung',
      postalCode: '80361',
      areaServed: ['Canggu', 'Berawa', 'Pererenan', 'Kerobokan', 'Seminyak', 'Batu Bolong', 'Echo Beach'],
      phone: '+6281929164999',
      whatsapp: '+6281929164999',
      email: 'hello@baliphonerepair.com',
      openingHours: ['Mo-Sa 09:00-20:00', 'Su 10:00-18:00'],
      openingHoursSpecification: [
        { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '20:00' },
        { dayOfWeek: ['Sunday'], opens: '10:00', closes: '18:00' }
      ],
      googleMapsUrl: 'https://maps.google.com/?q=iSmart+Canggu+Bali',
      pageUrl: 'https://baliphonerepair.com/branches/ismart-canggu',
      isWalkInWorkshop: true,
      hasOnSiteVillaService: true,
      hasCourierPickup: true,
      servicesOffered: [
        'Same-Day iPhone Screen Replacement in Canggu',
        'Express Battery Replacement Before Flying',
        'Water Spill Diagnostic for Laptops in Coworking Spaces',
        'Beach Sand & Port Debris Cleaning',
        'On-Site Villa & Hotel Repair Technician Visits',
        'Free Diagnostic Inspection'
      ],
      notesEn: 'Dedicated Canggu hub offering walk-ins and rapid mobile dispatch directly to villas and cafes along Pantai Berawa, Batu Bolong, and Pererenan.'
    },
    {
      branchCode: 'ISMART_TEUKU_UMAR',
      branchName: 'iSmart Teuku Umar',
      relationshipEn: 'iSmart Teuku Umar is a Bali Phone Repair branch located in Denpasar’s primary electronics technology and gadget corridor.',
      address: 'Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali',
      district: 'Denpasar Barat',
      city: 'Denpasar',
      postalCode: '80113',
      areaServed: ['Teuku Umar', 'Denpasar', 'Kuta', 'Sanur', 'Renon'],
      phone: '+6281929164999',
      whatsapp: '+6281929164999',
      email: 'hello@baliphonerepair.com',
      openingHours: ['Mo-Sa 09:00-21:00'],
      openingHoursSpecification: [
        { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '09:00', closes: '21:00' }
      ],
      googleMapsUrl: 'https://maps.google.com/?q=iSmart+Teuku+Umar+Denpasar',
      pageUrl: 'https://baliphonerepair.com/branches/ismart-teuku-umar',
      isWalkInWorkshop: true,
      hasOnSiteVillaService: true,
      hasCourierPickup: true,
      servicesOffered: [
        'Component-Level Logic Board Micro-Soldering',
        'Back Glass Laser Separation & Frame Straightening',
        'iPad Display & Digitizer Replacement',
        'MacBook SSD Upgrade & Thermal Paste Refresh',
        'Component Part Wholesale & Express Replacements'
      ],
      notesEn: 'Specialized hardware repair station in Jalan Teuku Umar with advanced laser equipment for rear glass repairs and micro-soldering rework.'
    }
  ]
}

/**
 * Builds standard Schema.org JSON-LD graph connecting parent organization and verified branches
 */
export function buildParentAndBranchesSchema(baseUrl: string = 'https://baliphonerepair.com'): string {
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'LocalBusiness',
        '@id': `${baseUrl}/#organization`,
        'name': MAIN_BRAND_INFO.name,
        'legalName': MAIN_BRAND_INFO.legalName,
        'url': baseUrl,
        'logo': MAIN_BRAND_INFO.logoUrl,
        'image': MAIN_BRAND_INFO.logoUrl,
        'telephone': MAIN_BRAND_INFO.mainPhone,
        'email': MAIN_BRAND_INFO.email,
        'description': 'Professional electronics repair service in Bali specializing in iPhone, MacBook, iPad, and Android repair with certified walk-in workshops and mobile on-site villa service.',
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': 'Jl. Pulau Misol No.106, Dauh Puri Kauh',
          'addressLocality': 'Denpasar',
          'addressRegion': 'Bali',
          'postalCode': '80113',
          'addressCountry': 'ID'
        },
        'areaServed': MAIN_BRAND_INFO.serviceAreas.map(area => ({
          '@type': 'AdministrativeArea',
          'name': area
        })),
        'subOrganization': MAIN_BRAND_INFO.verifiedBranches.map(branch => ({
          '@type': 'LocalBusiness',
          '@id': `${baseUrl}/#branch-${branch.branchCode.toLowerCase()}`,
          'name': branch.branchName,
          'alternateName': `${branch.branchName} (${branch.relationshipEn})`,
          'url': branch.pageUrl,
          'telephone': branch.phone,
          'description': `${branch.branchName} is a verified branch of ${MAIN_BRAND_INFO.name}. ${branch.notesEn}`,
          'address': {
            '@type': 'PostalAddress',
            'streetAddress': branch.address,
            'addressLocality': branch.district,
            'addressRegion': 'Bali',
            'postalCode': branch.postalCode,
            'addressCountry': 'ID'
          },
          'openingHoursSpecification': branch.openingHoursSpecification.map(spec => ({
            '@type': 'OpeningHoursSpecification',
            'dayOfWeek': spec.dayOfWeek,
            'opens': spec.opens,
            'closes': spec.closes
          }))
        }))
      }
    ]
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
}
