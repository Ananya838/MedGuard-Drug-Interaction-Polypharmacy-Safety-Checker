import PDFDocument from 'pdfkit';

/**
 * Generates a clean, doctor-ready one-page polypharmacy screening report as a PDF stream.
 *
 * @param {Object} patient - Patient record
 * @param {Array<Object>} medicines - Active medicine records
 * @param {Object} safetyReport - Engine output report
 * @param {NodeJS.WritableStream} outStream - Express response stream
 */
export function generateDoctorPdfReport(patient, medicines, safetyReport, outStream) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `MedGuard Safety Report - ${patient.name}`,
      Author: 'MedGuard Polypharmacy Safety System',
    },
  });

  doc.pipe(outStream);

  // 1. Header Banner
  doc
    .fillColor('#1e3a8a') // Navy Blue
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('MedGuard', { continued: true })
    .fillColor('#4b5563')
    .fontSize(12)
    .font('Helvetica')
    .text(' | Clinical Polypharmacy Screening Aid', { align: 'right' });

  doc.moveDown(0.5);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.8);

  // 2. Patient Profile Box
  const birthYear = patient.dob ? new Date(patient.dob).getFullYear() : null;
  const age = birthYear ? new Date().getFullYear() - birthYear : 'N/A';
  const allergiesText = Array.isArray(patient.allergies) && patient.allergies.length > 0
    ? patient.allergies.map((a) => (typeof a === 'object' ? `${a.type}:${a.id}` : String(a))).join(', ')
    : 'None recorded';
  const conditionsText = Array.isArray(patient.conditions) && patient.conditions.length > 0
    ? patient.conditions.join(', ')
    : 'None recorded';

  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#111827')
    .text(`Patient: ${patient.name}`);

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#374151')
    .text(`Age: ${age} years | Weight: ${patient.weight_kg ? patient.weight_kg + ' kg' : 'Not recorded'} | Date Generated: ${new Date().toLocaleDateString('en-GB')}`);

  doc.text(`Documented Allergies: ${allergiesText}`);
  doc.text(`Chronic Conditions: ${conditionsText}`);

  doc.moveDown(0.8);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.8);

  // 3. Current Medicine Regimen
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e3a8a')
    .text('Current Medicine Regimen:');

  doc.moveDown(0.4);

  if (medicines.length === 0) {
    doc.fontSize(10).font('Helvetica-Oblique').fillColor('#6b7280').text('No active medications recorded for this patient.');
  } else {
    for (const med of medicines) {
      const prnText = med.is_prn ? ' (As needed / PRN)' : '';
      const doseDesc = med.dose_amount ? `${med.dose_amount} ${med.dose_unit || 'dose'}` : '';
      const freqDesc = med.frequency_text ? ` - ${med.frequency_text}` : '';
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#1f2937')
        .text(`• ${med.brand_name || med.custom_name || 'Prescription'}: `, { continued: true })
        .font('Helvetica')
        .fillColor('#4b5563')
        .text(`${doseDesc}${freqDesc}${prnText}`);
    }
  }

  doc.moveDown(0.8);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.8);

  // 4. Safety Engine Findings
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e3a8a')
    .text('Safety Evaluation Findings:');

  doc.moveDown(0.4);

  const findings = safetyReport?.findings || [];

  if (findings.length === 0) {
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#065f46')
      .text('No known interaction found in our data. Always verify all medicines with a doctor or pharmacist.');
  } else {
    for (const finding of findings) {
      let badgeColor = '#b91c1c'; // Red (Major)
      if (finding.severity === 'moderate') badgeColor = '#c2410c'; // Orange
      if (finding.severity === 'minor') badgeColor = '#4b5563'; // Gray
      if (finding.severity === 'info') badgeColor = '#047857'; // Green

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor(badgeColor)
        .text(`[${(finding.severity || 'ALERT').toUpperCase()}] `, { continued: true })
        .fillColor('#111827')
        .text(`${finding.type.toUpperCase()}: ${finding.items?.join(' + ') || ''}`);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#374151')
        .text(`Summary: ${finding.summary}`);

      if (finding.action) {
        doc
          .font('Helvetica-Bold')
          .fillColor('#1e40af')
          .text(`Caregiver Action: `, { continued: true })
          .font('Helvetica')
          .fillColor('#1e40af')
          .text(finding.action);
      }
      doc.moveDown(0.4);
    }
  }

  // 5. Unrecognized items
  const unrecognized = safetyReport?.unrecognized || [];
  if (unrecognized.length > 0) {
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#92400e')
      .text('Unrecognized Packaging / Medicines:');

    for (const unrec of unrecognized) {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#78350f')
        .text(`• "${unrec.input || unrec}": ${unrec.reason || 'Could not identify in catalog. Please show packaging to a pharmacist.'}`);
    }
  }

  // 6. Mandatory Regulatory Disclaimer (At Bottom)
  doc.moveDown(1.5);
  doc
    .fontSize(8)
    .font('Helvetica-Oblique')
    .fillColor('#6b7280')
    .text(
      'MANDATORY DISCLAIMER: MedGuard is an informational polypharmacy screening tool. It does not provide medical advice, diagnosis, or treatment, and does not replace consultation with a licensed doctor or pharmacist. Never start, stop, or alter a medication dose without direct medical guidance. All sample clinical data is labeled: MedGuard sample data (not clinically verified).',
      { align: 'justify' }
    );

  doc.end();
}

