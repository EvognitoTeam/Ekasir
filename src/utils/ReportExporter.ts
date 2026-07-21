import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Type extension for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export class ReportExporter {
  static exportToCSV(filename: string, rows: any[][]) {
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static exportSalesReportPDF(reportData: any) {
    const doc = new jsPDF();
    doc.text('Bersejuk - Laporan Penjualan', 14, 20);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total Pendapatan: Rp ${reportData.totalRevenue.toLocaleString()}`, 14, 30);
    doc.text(`Total Transaksi: ${reportData.totalTransactions}`, 14, 38);
    doc.text(`AOV: Rp ${reportData.averageOrderValue.toLocaleString()}`, 14, 46);

    // Top Items Table
    doc.text('Menu Terlaris:', 14, 60);
    const tableBody = reportData.topItems.map((item: any) => [
      item.name, 
      item.quantity.toString(), 
      `Rp ${item.revenue.toLocaleString()}`
    ]);

    doc.autoTable({
      startY: 65,
      head: [['Nama Menu', 'Terjual', 'Pendapatan']],
      body: tableBody,
    });

    doc.save('Laporan_Penjualan_Bersejuk.pdf');
  }

  static exportSalesReportCSV(reportData: any) {
    const rows = [
      ['Total Pendapatan', 'Total Transaksi', 'Average Order Value'],
      [reportData.totalRevenue, reportData.totalTransactions, reportData.averageOrderValue],
      [],
      ['Nama Menu', 'Terjual', 'Pendapatan'],
      ...reportData.topItems.map((item: any) => [item.name, item.quantity, item.revenue])
    ];
    this.exportToCSV('Laporan_Penjualan_Bersejuk.csv', rows);
  }

  static exportStockReportPDF(stockData: any) {
    const doc = new jsPDF();
    doc.text('Bersejuk - Laporan Stok', 14, 20);

    const tableBody = stockData.map((item: any) => [
      item.name,
      item.category,
      item.currentStock.toString(),
      item.isOutOfStock ? 'Habis' : (item.isLow ? 'Menipis' : 'Aman')
    ]);

    doc.autoTable({
      startY: 30,
      head: [['Nama Menu', 'Kategori', 'Stok Saat Ini', 'Status']],
      body: tableBody,
    });

    doc.save('Laporan_Stok_Bersejuk.pdf');
  }

  static exportStockReportCSV(stockData: any) {
    const rows = [
      ['Nama Menu', 'Kategori', 'Stok Saat Ini', 'Status'],
      ...stockData.map((item: any) => [
        item.name,
        item.category,
        item.currentStock,
        item.isOutOfStock ? 'Habis' : (item.isLow ? 'Menipis' : 'Aman')
      ])
    ];
    this.exportToCSV('Laporan_Stok_Bersejuk.csv', rows);
  }
}
