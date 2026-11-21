import { initFirebase } from './firestore';
import { parseSpecsDeterministically } from './parser';

async function main() {
  const db = initFirebase();
  const snap = await db.collection('listings').get();
  let total = 0;
  let updated = 0;
  let catChanged = 0;
  let chipChanged = 0;

  let batch = db.batch();
  let batchOps = 0;

  for (const docSnap of snap.docs) {
    total++;
    const d = docSnap.data();
    const specs = parseSpecsDeterministically(
      d.title || '',
      d.rawPrice || '',
      d.description || '',
      d.locationText || '',
      d.city || 'Perú'
    );

    const nextCity =
      specs.ciudad_real && specs.ciudad_real.trim() && specs.ciudad_real.trim() !== 'Perú'
        ? specs.ciudad_real.trim()
        : d.city || 'Perú';

    const updates: Record<string, any> = {};

    if (d.categoria !== specs.categoria) {
      updates.categoria = specs.categoria;
      catChanged++;
    }
    if (d.chip !== specs.chip || d.chip_variante !== specs.chip_variante) {
      updates.chip = specs.chip;
      updates.chip_variante = specs.chip_variante;
      chipChanged++;
    }
    if ((d.pulgadas ?? null) !== (specs.pulgadas ?? null)) updates.pulgadas = specs.pulgadas;
    if ((d.ram_gb ?? null) !== (specs.ram_gb ?? null)) updates.ram_gb = specs.ram_gb;
    if ((d.almacenamiento_gb ?? null) !== (specs.almacenamiento_gb ?? null)) {
      updates.almacenamiento_gb = specs.almacenamiento_gb;
    }
    if (d.city !== nextCity || (d.distrito_ciudad || '') !== (specs.distrito_ciudad || '')) {
      updates.city = nextCity;
      updates.distrito_ciudad = specs.distrito_ciudad;
    }

    if (Object.keys(updates).length > 0) {
      updates.tags = specs.tags;
      batch.update(docSnap.ref, updates);
      updated++;
      batchOps++;
      if (batchOps >= 400) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    }
  }

  if (batchOps > 0) {
    await batch.commit();
  }

  console.log('✅ Reorganización completada:', { total, updated, catChanged, chipChanged });
}

main().catch((err) => {
  console.error('❌ Error reorganizando Firestore:', err?.message || err);
  process.exit(1);
});
