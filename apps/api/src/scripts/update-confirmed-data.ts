import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateConfirmedData() {
  const tenantId = 'cmtnqo1tu0000vdkvz14w1tgm';

  console.log('Updating confirmed business details for tenant:', tenantId);

  // Update Bale Bali / Bali Phone Repair branch to confirm head office & central lab
  await prisma.branchProfile.upsert({
    where: {
      tenantId_branchCode: {
        tenantId,
        branchCode: 'bale-bali'
      }
    },
    update: {
      address: 'Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113',
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–21:00 / 22:00 | Sun: 09:00–18:00',
      notes: 'Confirmed by owner: Bali Phone Repair main location is identical to Bale Bali (Jl. Pulau Misol 106). Flagship central workshop with micro-soldering lab.'
    },
    create: {
      tenantId,
      branchCode: 'bale-bali',
      branchName: 'Bale Bali (Central Workshop & Head Office)',
      relationship: 'Bale Bali is the flagship central workshop of Bali Phone Repair',
      address: 'Jl. Pulau Misol No. 106, Dauh Puri Kauh, Denpasar, Bali 80113',
      city: 'Denpasar',
      areaServed: ['Denpasar', 'Sanur', 'Kuta', 'Seminyak'],
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–21:00 / 22:00 | Sun: 09:00–18:00',
      isWalkIn: true,
      hasVillaService: true,
      hasPickup: true,
      servicesOffered: ['Hardware Diagnostics', 'Motherboard Micro-Soldering', 'Screen Replacement', 'Device Rental'],
      notes: 'Confirmed by owner: Bali Phone Repair main location is identical to Bale Bali (Jl. Pulau Misol 106).'
    }
  });

  // Update iSmart Teuku Umar branch
  await prisma.branchProfile.upsert({
    where: {
      tenantId_branchCode: {
        tenantId,
        branchCode: 'ismart-teuku-umar'
      }
    },
    update: {
      address: 'Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali 80113',
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–21:00 / 22:00',
      notes: 'Confirmed by owner: iSmart Teuku Umar is an official Bali Phone Repair branch on Jl. Teuku Umar (directly competing with Dewata Repair, iFixied, and Cellular World).'
    },
    create: {
      tenantId,
      branchCode: 'ismart-teuku-umar',
      branchName: 'iSmart Teuku Umar (Tech Corridor Branch)',
      relationship: 'iSmart Teuku Umar is an official Bali Phone Repair branch',
      address: 'Jl. Teuku Umar No. 241, Dauh Puri Kauh, Denpasar Barat, Bali 80113',
      city: 'Denpasar',
      areaServed: ['Denpasar Barat', 'Teuku Umar Tech Strip', 'Imam Bonjol', 'Kuta'],
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–21:00 / 22:00',
      isWalkIn: true,
      hasVillaService: true,
      hasPickup: true,
      servicesOffered: ['Laser Back Glass', 'Express Screen Repair', 'Logic Board Repair', 'iPad Laminating'],
      notes: 'Confirmed by owner.'
    }
  });

  // Update iSmart Canggu branch
  await prisma.branchProfile.upsert({
    where: {
      tenantId_branchCode: {
        tenantId,
        branchCode: 'ismart-canggu'
      }
    },
    update: {
      address: 'Jl. Raya Canggu, Kerobokan, Badung, Bali 80361',
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–20:00 / 21:00 | Sun: 10:00–18:00',
      notes: 'Confirmed by owner: Single WhatsApp +6281929164999. In-villa mobile service 60-90 min response with zero surcharge for standard Canggu area.'
    },
    create: {
      tenantId,
      branchCode: 'ismart-canggu',
      branchName: 'iSmart Canggu (Canggu Hub & Villa Service)',
      relationship: 'iSmart Canggu is an official Bali Phone Repair branch',
      address: 'Jl. Raya Canggu, Kerobokan, Badung, Bali 80361',
      city: 'Canggu',
      areaServed: ['Canggu', 'Berawa', 'Pererenan', 'Batu Bolong', 'Echo Beach', 'Umalas'],
      phone: '+6281929164999',
      openingHours: 'Mon–Sat: 09:00–20:00 / 21:00 | Sun: 10:00–18:00',
      isWalkIn: true,
      hasVillaService: true,
      hasPickup: true,
      servicesOffered: ['Express iPhone Screen', 'Water Damage Recovery', 'Battery Replacement', 'Villa Call-out Service'],
      notes: 'Confirmed by owner.'
    }
  });

  // Inject top 5 attack keywords into TenantSetting
  const setting = await prisma.tenantSetting.findFirst({ where: { tenantId } });
  if (setting) {
    const existingKeywords = setting.targetKeywords || [];
    const newKeywords = [
      'Top Rated Phone & iPhone Repair Shops on Jl. Teuku Umar Denpasar Open Tonight',
      'Where Can Digital Nomads and Tourists Walk In for Same-Day iPhone Screen Repair in Canggu?',
      'Does Bali Phone Repair Have Walk-In Physical Workshops in Denpasar and Canggu?',
      'Where to Fix Broken Samsung Galaxy and Android Screens with Warranty in Bali Today?',
      ...existingKeywords
    ];
    // Deduplicate
    const uniqueKeywords = Array.from(new Set(newKeywords));

    await prisma.tenantSetting.update({
      where: { id: setting.id },
      data: {
        targetKeywords: uniqueKeywords
      }
    });
    console.log('Updated targetKeywords with top 5 competitive queries!');
  }

  console.log('Confirmed data saved to database successfully!');
  await prisma.$disconnect();
}

updateConfirmedData().catch(err => {
  console.error(err);
  process.exit(1);
});
