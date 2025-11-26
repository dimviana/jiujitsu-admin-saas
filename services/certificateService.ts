import jsPDF from 'jspdf';
import { Student, Graduation, Academy } from '../types';

export const generateCertificate = (student: Student, graduation: Graduation, academy: Academy) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background Border
  doc.setLineWidth(2);
  doc.setDrawColor(245, 158, 11); // Primary/Amber color
  doc.rect(10, 10, width - 20, height - 20);
  
  doc.setLineWidth(1);
  doc.setDrawColor(0, 0, 0);
  doc.rect(12, 12, width - 24, height - 24);

  // Header / Academy Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.setTextColor(30, 30, 30);
  doc.text(academy.name.toUpperCase(), width / 2, 40, { align: 'center' });

  // Title
  doc.setFontSize(40);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text('CERTIFICADO DE GRADUAÇÃO', width / 2, 60, { align: 'center' });

  // Main Text
  doc.setFontSize(16);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.text('Certificamos que', width / 2, 80, { align: 'center' });

  // Student Name
  doc.setFontSize(36);
  doc.setFont('times', 'bold'); // Serif font looks more formal
  doc.setTextColor(0, 0, 0);
  doc.text(student.name, width / 2, 95, { align: 'center' });

  // Main Text Continued
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('cumpriu todos os requisitos técnicos e disciplinares para ser promovido à', width / 2, 110, { align: 'center' });

  // Belt Rank
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 158, 11);
  doc.text(graduation.name.toUpperCase(), width / 2, 125, { align: 'center' });

  // Date
  const today = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(14);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text(`Concedido em ${today}`, width / 2, 140, { align: 'center' });

  // Signatures Area
  const sigY = 170;
  const lineLength = 70;
  
  // Professor Signature Line
  doc.setDrawColor(0, 0, 0);
  doc.line((width / 2) - lineLength - 10, sigY, (width / 2) - 10, sigY);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Professor Responsável', (width / 2) - (lineLength / 2) - 10, sigY + 6, { align: 'center' });

  // Academy/Responsible Signature Line
  doc.line((width / 2) + 10, sigY, (width / 2) + lineLength + 10, sigY);
  doc.text(academy.responsible, (width / 2) + (lineLength / 2) + 10, sigY + 6, { align: 'center' });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Jiu-Jitsu Hub System - Verifique a autenticidade na sua academia.', width / 2, height - 15, { align: 'center' });

  // Save
  doc.save(`certificado_${student.name.replace(/\s+/g, '_')}_${graduation.name}.pdf`);
};