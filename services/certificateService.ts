import jsPDF from 'jspdf';
import { Student, Graduation, Academy } from '../types';

export const generateCertificate = (student: Student, newGraduation: Graduation, academy: Academy) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // ----- STYLING & STATIC CONTENT based on the image -----
  
  // -- HEADER --
  // Using a blocky, impactful font available in jsPDF's core fonts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text('PAULO CARECA JIU-JITSU TEAM', width / 2, 25, { align: 'center' });

  // Black and Red belt representation in header
  doc.setFillColor(0, 0, 0);
  doc.rect(80, 30, 60, 8, 'F'); // Black part
  doc.setFillColor(200, 0, 0); // Red part
  doc.rect(140, 30, 60, 8, 'F');
  // Add dot texture to the red part
  doc.setFillColor(150, 0, 0);
  for (let i = 1; i < 60; i += 2) {
      for (let j = 1; j < 8; j += 2) {
          doc.rect(140 + i, 30 + j, 0.5, 0.5, 'F');
      }
  }
  // White stripes on the red part
  doc.setFillColor(255,255,255);
  doc.rect(165, 30, 1.5, 8, 'F');
  doc.rect(170, 30, 1.5, 8, 'F');
  doc.rect(175, 30, 1.5, 8, 'F');
  
  doc.setFillColor(0, 0, 0);
  doc.rect(200, 30, 8, 8, 'F'); // Black square at the end


  // -- CERTIFICATE TITLE --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.text('CERTIFICADO', width / 2, 60, { align: 'center' });


  // -- BODY --
  const bodyY = 85;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  const professorText = `${academy.responsible}, faixa preta pela Federação de Jiu-Jitsu,`;
  doc.text(professorText, width / 2, bodyY, { align: 'center' });
  
  doc.text('confere a', width / 2, bodyY + 8, { align: 'center' });
  
  // Student Name - using a script-like font
  doc.setFont('times', 'italic');
  doc.setFontSize(28);
  doc.text(student.name, width / 2, bodyY + 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('a graduação na faixa:', width / 2, bodyY + 30, { align: 'center' });

  // -- BELT REPRESENTATION --
  const beltY = bodyY + 35;
  const beltWidth = 100;
  const beltHeight = 12;
  const beltX = (width - beltWidth) / 2;
  const tipWidth = beltWidth / 5;

  // Belt main color
  const beltColorHex = newGraduation.color.substring(1); // Remove '#'
  const r = parseInt(beltColorHex.slice(0, 2), 16);
  const g = parseInt(beltColorHex.slice(2, 4), 16);
  const b = parseInt(beltColorHex.slice(4, 6), 16);
  doc.setFillColor(r, g, b);

  if (newGraduation.color === '#ffffff') {
      doc.setDrawColor(0,0,0);
      doc.rect(beltX, beltY, beltWidth, beltHeight, 'FD'); // Fill and Draw for white belt
  } else {
      doc.rect(beltX, beltY, beltWidth, beltHeight, 'F');
  }

  // Black tip
  doc.setFillColor(0, 0, 0);
  doc.rect(beltX + beltWidth - tipWidth, beltY, tipWidth, beltHeight, 'F');
  
  // Belt name on top of the belt
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  // Add a black shadow/outline to the text for better visibility
  doc.setTextColor(0,0,0);
  doc.text(newGraduation.name.toUpperCase(), width / 2 + 0.5, beltY + (beltHeight / 2) + 3.5, { align: 'center' });
  doc.setTextColor(255,255,255);
  doc.text(newGraduation.name.toUpperCase(), width / 2, beltY + (beltHeight / 2) + 3, { align: 'center' });


  // -- EXCELLENCE TEXT --
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('por sua excelência na prática do Jiu-Jitsu Brasileiro.', width / 2, beltY + 25, { align: 'center' });

  // -- DATE & LOCATION --
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  const city = academy.address?.split('-')[1]?.trim() || 'Sua Cidade'; 
  doc.text(`${city}, ${today}`, width / 2, beltY + 35, { align: 'center' });

  // -- SIGNATURE --
  const sigY = height - 55;
  doc.setDrawColor(0,0,0);
  doc.line(width / 2 - 35, sigY, width / 2 + 35, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(academy.responsible, width / 2, sigY + 6, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`FJJPE: ${academy.responsibleRegistration || 'N/A'}`, width / 2, sigY + 11, { align: 'center' });


  // -- MOTTO --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('TEMPO RUIM, O TEMPO TODO.', width / 2, height - 30, { align: 'center' });

  // -- FOOTER --
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  // These should be dynamic from academy data in a real app
  const cnpj = 'CNPJ: 18.193.774/0001-41 - ACADEMIA MULT FORMAS';
  const address = 'R SAO MATEUS, 62 - SAO FRANCISCO - CÀRUARU-PE';
  doc.text(cnpj, 20, height - 10);
  doc.text(address, width - 20, height - 10, { align: 'right' });


  // -- SAVE --
  doc.save(`certificado_${student.name.replace(/\s+/g, '_')}_${newGraduation.name}.pdf`);
};