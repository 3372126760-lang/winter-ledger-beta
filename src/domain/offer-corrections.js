export function applyOfferCorrections(packs,corrections){
  for(const correction of corrections){
    const section=packs.find(p=>p.id===correction.packId)?.sections.find(s=>s.id===correction.sectionId);
    if(!section||section.rows.length!==correction.quantities.length)throw new Error('截图修正与礼包结构不符，请复核');
    section.rows.forEach((row,index)=>{
      const material=row.materials.find(m=>m.rawName===correction.rawName);
      if(!material)throw new Error('截图修正的材料列不存在');
      material.rawQuantity=String(correction.quantities[index]);
      if(material.itemId)material.quantity=correction.quantities[index];
    });
    section.evidence=correction.evidence;section.correctionNote=correction.note;
  }
  return packs;
}
