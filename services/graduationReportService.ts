import jsPDF from 'jspdf';
import { Graduation } from '../types';

interface GraduationReportItem {
    studentName: string;
    currentBelt: Graduation;
    currentStripes: number;
    frequency: number;
    nextBelt?: Graduation;
    isPromotion: boolean; // True if next belt is different from current
}

export const generateGraduationReport = (
    academyName: string,
    items: GraduationReportItem[]
) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let yPos = 20;

    // --- Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(academyName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(14);
    doc.text('Relatório de Graduação', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 15;

    // --- Table Header ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 5, pageWidth - (margin * 2), 8, 'F');
    
    doc.text('Aluno', margin + 2, yPos);
    doc.text('Faixa Atual / Graus', 80, yPos);
    doc.text('Freq.', 125, yPos);
    doc.text('Próxima Faixa', 150, yPos);

    yPos += 10;

    // --- Helper to draw belt ---
    const drawBelt = (x: number, y: number, colorHex: string, stripes: number, width: number = 35) => {
        const height = 6;
        
        // Main Belt Color
        const hex = colorHex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        doc.setFillColor(r, g, b);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        
        if (colorHex.toLowerCase() === '#ffffff') {
            doc.rect(x, y, width, height, 'FD'); // Fill and Draw for white
        } else {
            doc.rect(x, y, width, height, 'F');
        }

        // Black Bar
        const barWidth = 10;
        doc.setFillColor(0, 0, 0);
        doc.rect(x + width - barWidth, y, barWidth, height, 'F');

        // Stripes
        doc.setFillColor(255, 255, 255);
        const stripeWidth = 1;
        const stripeGap = 1.5;
        let stripeX = x + width - barWidth + 1.5;
        
        for (let i = 0; i < stripes; i++) {
            doc.rect(stripeX, y, stripeWidth, height, 'F');
            stripeX += stripeWidth + stripeGap;
        }
    };

    // --- Rows ---
    doc.setFont('helvetica', 'normal');
    
    items.forEach((item, index) => {
        // Page break check
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }

        // Zebra striping
        if (index % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(margin, yPos - 4, pageWidth - (margin * 2), 12, 'F');
        }

        // Name
        doc.setTextColor(0, 0, 0);
        doc.text(item.studentName.substring(0, 25), margin + 2, yPos + 2);

        // Current Belt Drawing
        drawBelt(80, yPos - 2, item.currentBelt.color, item.currentStripes);
        
        // Frequency
        const freqText = `${Math.round(item.frequency)}%`;
        if (item.frequency < 75) doc.setTextColor(200, 0, 0); // Red if low freq
        else doc.setTextColor(0, 100, 0);
        doc.text(freqText, 125, yPos + 2);

        // Next Belt Drawing (only if selected/different)
        if (item.nextBelt) {
            drawBelt(150, yPos - 2, item.nextBelt.color, 0); // Next belt starts with 0 stripes usually, or handled differently
        } else {
            doc.setTextColor(150, 150, 150);
            doc.text("-", 160, yPos + 2);
        }

        yPos += 12;
    });

    // --- Footer Summary ---
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Total de Alunos Listados: ${items.length}`, margin, yPos);

    doc.save('lista_graduacao.pdf');
};