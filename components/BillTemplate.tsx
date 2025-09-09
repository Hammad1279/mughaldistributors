import { FinalizedBill, CartItem, BillLayoutSettings } from '../types';

export const BillTemplate = (bill: FinalizedBill, settings: BillLayoutSettings): string => {
    
    // --- Helper Functions ---
    const escapeHTML = (str: any): string => {
        const strVal = String(str ?? '');
        if (!strVal) return '';
        return strVal.replace(
            /[&<>'"]/g,
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;',
            }[tag] || tag)
        );
    };
    
    const getFormattedDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // --- Data Processing ---
    const items = Array.isArray(bill.items) ? bill.items : [];
    const grossAmount = items.reduce((acc, item) => acc + (item.mrp * item.quantity), 0);
    const shouldShowTaxColumn = items.some(item => item.salesTaxAmount && item.salesTaxAmount > 0);
    const shouldShowBatchNoColumn = items.some(item => item.batchNo && item.batchNo.trim() !== '');

    // --- HTML Generation for Items ---
    const itemsHTML = items.map((item: CartItem) => {
        const itemGross = item.mrp * item.quantity;
        return `
            <tr>
                <td class="text-center">${item.quantity}</td>
                <td class="text-left">${escapeHTML(item.name)}</td>
                <td class="text-center">${item.mrp.toFixed(2)}</td>
                <td class="text-center">${itemGross.toFixed(2)}</td>
                <td class="text-center">${item.discountValue ?? 0}%</td>
                ${shouldShowTaxColumn ? `<td class="text-center">${(item.salesTaxAmount || 0).toFixed(2)}</td>` : ''}
                ${shouldShowBatchNoColumn ? `<td class="text-center">${escapeHTML(item.batchNo) || '---'}</td>` : ''}
                <td class="text-center">${item.netAmount.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    const footerHTML = settings.footerText ? `
        <div class="footer">
            <p>${escapeHTML(settings.footerText)}</p>
        </div>
    ` : '';


    // --- Final HTML String ---
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bill</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Lato:wght@400;700&family=Roboto+Slab:wght@700&family=Roboto:wght@400;700&display=swap');
            @page {
                size: A4;
                margin: 0;
            }
            body {
                font-family: 'Roboto', sans-serif;
                font-size: 10pt;
                color: #000000;
                margin: 0;
                padding: 0;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .invoice-box {
                background: #ffffff;
                width: 100%;
                min-height: 297mm;
                padding: 10mm;
                margin: 0;
                box-sizing: border-box;
                box-shadow: none;
                display: flex;
                flex-direction: column;
            }
            .content-wrap {
                flex: 1;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                line-height: 1.3;
            }
            p {
                margin: 0 0 2px 0;
            }
            .main-title {
                font-family: 'Cinzel', serif;
                font-size: 26pt;
                font-weight: 700;
                letter-spacing: 4px; 
                text-align: center;
                padding-bottom: 15px; 
                color: #000000;
                border-bottom: 2px solid #000000;
                margin-bottom: 15px;
                text-transform: uppercase; 
                text-shadow: none;
            }
            .bill-info-table {
                margin-top: 10px;
                font-family: 'Lato', sans-serif;
                font-size: 10.5pt;
                line-height: 1.2;
            }
            .bill-info-table td {
                padding-top: 1px;
                padding-bottom: 1px;
                vertical-align: top;
            }
            .bill-info-table b, .totals-box b {
                font-weight: 700;
            }
            .distributor-info {
                font-family: 'Roboto Slab', serif;
                font-weight: 700;
            }
            .items-table {
                margin-top: 20px;
                width: 100%;
                border: 1px solid #000000;
            }
            .items-table thead th {
                background-color: #ffffff !important;
                font-weight: 700;
                padding: 5px 8px;
                border-bottom: 1px solid #000000;
                border-right: 1px solid #000000;
            }
            .items-table thead th:last-child {
                border-right: none;
            }
            .items-table tbody td {
                padding: 3px 8px;
                border-right: 1px solid #000000;
                font-size: 9.5pt;
            }
            .items-table tbody td:last-child {
                border-right: none;
            }
            .items-table tbody tr:not(:last-child) td {
                border-bottom: 1px solid #cccccc;
            }
            .totals-box {
                background-color: #ffffff !important;
                padding: 10px;
                border: 2px solid #000000;
            }
            .totals-box table td {
                padding: 4px 0;
                font-size: 10pt;
            }
            .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #cccccc;
                text-align: center;
                font-size: 9pt;
                color: #000000;
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
                    background: #ffffff;
                }
            }
        </style>
    </head>
    <body>
        <div class="invoice-box">
            <div class="content-wrap">
                <div class="main-title">${escapeHTML(settings.distributorName)}</div>
                
                <table class="bill-info-table">
                    <tr>
                        <td style="width: 50%;">
                            <p><b>Bill to:</b> ${escapeHTML(bill.storeName)}</p>
                            <p><b>Address:</b> ${escapeHTML(bill.storeAddress)}</p>
                            <p><b>Bill No:</b> #${escapeHTML(bill.billNo)}</p>
                            ${settings.showBillDate ? `<p><b>Bill Date:</b> ${getFormattedDate(bill.date)}</p>` : ''}
                        </td>
                        <td style="width: 50%; text-align: right;" class="distributor-info">
                            <p>${escapeHTML(settings.distributorTitle)}</p>
                            <p>${escapeHTML(settings.distributorAddressLine1)}</p>
                            <p>${escapeHTML(settings.distributorAddressLine2)}</p>
                            ${settings.showPhoneNumber ? `<p>${escapeHTML(settings.phoneNumber)}</p>` : ''}
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
                
                <table style="width: 100%; margin-top: 20px;">
                    <tr>
                        <td style="width: 55%;"></td>
                        <td style="width: 45%;">
                            <div class="totals-box">
                                <table>
                                    <tr>
                                        <td><b>Gross Amount:</b></td>
                                        <td class="text-right">${grossAmount.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td><b>Net Amount:</b></td>
                                        <td class="text-right">${bill.grandTotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td><b>Net Payable:</b></td>
                                        <td class="text-right"><b>${bill.grandTotal.toFixed(2)}</b></td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>
            ${footerHTML}
        </div>
    </body>
    </html>
    `;
};