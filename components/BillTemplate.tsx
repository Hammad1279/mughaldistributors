
import { FinalizedBill, CartItem, BillLayoutSettings } from '../types';

export const BillTemplate = (bill: FinalizedBill, settings: BillLayoutSettings): string => {
    const getFormattedDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const grossAmount = bill.items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);

    // Determine which optional columns to show based on the data in this specific bill
    const shouldShowTaxColumn = bill.items.some(item => item.salesTaxAmount && item.salesTaxAmount > 0);
    const shouldShowBatchNoColumn = bill.items.some(item => item.batchNo && item.batchNo.trim() !== '');

    let itemsHTML = '';
    bill.items.forEach((item: CartItem) => {
        const itemGross = item.mrp * item.quantity;
        itemsHTML += `
            <tr>
                <td class="text-center">${item.quantity}</td>
                <td>${item.name}</td>
                <td class="text-center">${item.mrp.toFixed(2)}</td>
                <td class="text-center">${itemGross.toFixed(2)}</td>
                <td class="text-center">${item.discountValue ?? 0}%</td>
                ${shouldShowTaxColumn ? `<td class="text-center">${(item.salesTaxAmount || 0).toFixed(2)}</td>` : ''}
                ${shouldShowBatchNoColumn ? `<td class="text-center">${item.batchNo || '---'}</td>` : ''}
                <td class="text-center">${item.netAmount.toFixed(2)}</td>
            </tr>
        `;
    });

    return `
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Garamond:wght@700&family=Inter:wght@400;700&display=swap');
            @page {
                size: A4;
                margin: 0;
            }
            body {
                font-family: 'Inter', sans-serif;
                font-size: 10pt;
                color: #2b2b2b;
                margin: 0;
                padding: 0;
                background-color: #e0e0e0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .invoice-box {
                background: #f8f6f2; /* Creamy off-white background */
                width: 210mm;
                min-height: 297mm; /* Ensure it's at least A4 height, but can grow */
                padding: 12mm;
                margin: 10mm auto;
                box-sizing: border-box;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
            }
            table {
                width: 100%;
                border-collapse: collapse;
                line-height: 1.5;
            }
            p {
                margin: 0 0 4px 0;
            }
            .main-title {
                font-family: 'Garamond', serif;
                font-size: 28pt;
                font-weight: bold;
                letter-spacing: 4px;
                text-align: center;
                padding-bottom: 8px;
            }
            .bill-info-table {
                margin-top: 25px;
            }
            .bill-info-table td {
                padding-top: 2px;
                padding-bottom: 2px;
                vertical-align: top;
            }
            .bill-info-table b {
                font-weight: 700;
            }
            .items-table {
                margin-top: 20px;
                width: 100%;
                table-layout: auto; /* Allow table to dynamically size columns */
            }
            .items-table thead th {
                background-color: #D9E2D6 !important;
                color: #000;
                font-weight: 700;
                padding: 8px;
                border-left: 1px solid #333;
                border-right: 1px solid #333;
            }
            .items-table thead th:first-child { border-left: none; }
            .items-table thead th:last-child { border-right: none; }
            .items-table tbody td {
                padding: 8px;
                background-color: #FFFFFF !important;
                border-bottom: 1px solid #eee; /* Add subtle separator */
            }
            .items-table tbody tr:last-child td {
                border-bottom: none;
            }
            .totals-section {
                margin-top: 20px;
                display: flex;
                justify-content: flex-end;
            }
            .totals-box {
                width: 45%;
                background-color: #D9E2D6 !important;
                padding: 10px 15px;
            }
            .totals-box table td {
                padding: 4px 0;
            }
            .totals-box b {
                font-weight: 700;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }

            @media print {
                body { background: white; }
                .invoice-box {
                    margin: 0;
                    padding: 12mm;
                    box-shadow: none;
                    width: auto;
                    min-height: auto;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="main-title">MUGHAL DISTRIBUTORS</div>
            
            <table class="bill-info-table">
                <tr>
                    <td style="width: 50%;">
                        <p><b>Bill to:</b> ${bill.storeName}</p>
                        <p><b>Adress:</b> ${bill.storeAddress}</p>
                        <p><b>Bill No:</b> #${bill.billNo}</p>
                        ${settings.showBillDate ? `<p><b>Bill Date:</b> ${getFormattedDate(bill.date)}</p>` : ''}
                    </td>
                    <td style="width: 50%; text-align: right;">
                        <p>ESTIMATE,</p>
                        <p>Bismillah Plaza, Opp. Sonari Bank</p>
                        <p>Chinioat Bazar, Faisalabad</p>
                        ${settings.showPhoneNumber ? `<p>${settings.phoneNumber}</p>` : ''}
                    </td>
                </tr>
            </table>

            <table class="items-table">
                <thead>
                    <tr>
                        <th class="text-center">QTY</th>
                        <th class="text-left">PRODUCT NAME</th>
                        <th class="text-center">RATE</th>
                        <th class="text-center">G.AMT</th>
                        <th class="text-center">%DISC</th>
                        ${shouldShowTaxColumn ? '<th class="text-center">TAX</th>' : ''}
                        ${shouldShowBatchNoColumn ? '<th class="text-center">B.NO</th>' : ''}
                        <th class="text-center">N.AMT</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>

            <div class="totals-section">
                <div class="totals-box">
                    <table>
                        <tr>
                            <td><b>G.AMT:</b></td>
                            <td class="text-right">${grossAmount.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><b>NET.AMT:</b></td>
                            <td class="text-right">${bill.grandTotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td><b>NET.PAYABLE</b></td>
                            <td class="text-right">${bill.grandTotal.toFixed(2)}</td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
