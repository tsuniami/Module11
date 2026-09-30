/* ============================================================
   SneakerPapi — Module 11: Down Payment & Stock Reservation
   Business Process: Online customers can reserve products by
   paying a required down payment. Once the payment is recorded,
   the system reserves the ordered items so they are not
   accidentally sold to another customer.

   Data Structure : Manual Hash Map (Order ID -> Order record,
                    buckets with chained entries) +
                    Manual Linked List (stock nodes)
   Algorithm      : Reservation Allocation Algorithm
   Rule           : No predefined collection methods, no Map/Set.
   ============================================================ */

//Constants

var UPPER_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var LOWER_LETTERS = "abcdefghijklmnopqrstuvwxyz";
var HASH_CHARSET  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-";   // value of a character = its position + 1
var BUCKET_COUNT  = 5;
var MAX_REFERENCE_LENGTH = 30;


function twoDigits(value) {
    if (value < 10) {
        return "0" + value;
    }
    return "" + value;
}

function buildTimestamp(now) {
    return now.getFullYear() + "-" + twoDigits(now.getMonth() + 1) + "-" + twoDigits(now.getDate()) +
           " " + twoDigits(now.getHours()) + ":" + twoDigits(now.getMinutes()) + ":" + twoDigits(now.getSeconds());
}

// Whole-number part only: builds "7,500" digit by digit
function formatWithCommas(amount) {
    if (amount === 0) {
        return "0";
    }
    var result = "";
    var digitCount = 0;
    while (amount > 0) {
        var digit = amount % 10;
        if (digitCount === 3) {
            result = "," + result;
            digitCount = 0;
        }
        result = digit + result;
        amount = Math.floor(amount / 10);
        digitCount = digitCount + 1;
    }
    return result;
}

function round2(value) {
    return Math.round(value * 100) / 100;
}

// Peso with centavos: 6500 -> "₱6,500.00"
function peso(amount) {
    var centavos = Math.round(amount * 100);
    var whole = Math.floor(centavos / 100);
    var cents = centavos - (whole * 100);
    return "\u20B1" + formatWithCommas(whole) + "." + twoDigits(cents);
}

// Removes leading/trailing spaces and tabs
function trimText(text) {
    var start = 0;
    var end = text.length - 1;
    while (start <= end && (text[start] === " " || text[start] === "\t")) { start++; }
    while (end >= start && (text[end] === " " || text[end] === "\t")) { end--; }
    var result = "";
    for (var i = start; i <= end; i++) {
        result = result + text[i];
    }
    return result;
}

// Converts letters to capitals by looking each letter up in the two alphabets
function toUpperText(text) {
    var result = "";
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        var converted = ch;
        for (var j = 0; j < LOWER_LETTERS.length; j++) {
            if (LOWER_LETTERS[j] === ch) {
                converted = UPPER_LETTERS[j];
                break;
            }
        }
        result = result + converted;
    }
    return result;
}

// Numeric value of a character (0 = not a letter, digit or hyphen)
function charValue(ch) {
    for (var i = 0; i < HASH_CHARSET.length; i++) {
        if (HASH_CHARSET[i] === ch) {
            return i + 1;
        }
    }
    return 0;
}

// Payment reference: letters, digits and hyphen only (text is already upper-cased)
function isValidReference(text) {
    for (var i = 0; i < text.length; i++) {
        if (charValue(text[i]) === 0) {
            return false;
        }
    }
    return true;
}

// Keeps typed text from breaking the page
function escapeHtml(text) {
    var result = "";
    for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        if (ch === "&") { result = result + "&amp;"; }
        else if (ch === "<") { result = result + "&lt;"; }
        else if (ch === ">") { result = result + "&gt;"; }
        else if (ch === '"') { result = result + "&quot;"; }
        else { result = result + ch; }
    }
    return result;
}

/* ---------- Manual Linked List: Item Stock Nodes ---------- */

class StockNode {
    constructor(item) {
        this.item = item;   // { code, name, size, price, netAvailableStock, reservedStock }
        this.next = null;   // pointer to the next node
    }
}

class StockList {
    constructor() {
        this.head = null;
        this.length = 0;
    }

    // Walk to the last node, then attach the new node
    append(item) {
        var node = new StockNode(item);
        if (this.head === null) {
            this.head = node;
        } else {
            var last = this.head;
            while (last.next !== null) {
                last = last.next;
            }
            last.next = node;
        }
        this.length = this.length + 1;
    }

    // Traverse the list looking for a matching Item CODE
    findByCode(code) {
        var current = this.head;
        while (current !== null) {
            if (current.item.code === code) {
                return current.item;
            }
            current = current.next;
        }
        return null;
    }
}

/* ---------- Manual Hash Map: Order ID -> Order Record ---------- */

class OrderEntry {
    constructor(key, value) {
        this.key = key;     // Order ID
        this.value = value; // Order record
        this.next = null;   // next entry in the same bucket (chaining)
    }
}

class OrderHashMap {
    constructor(bucketCount) {
        this.bucketCount = bucketCount;
        this.buckets = [];
        this.size = 0;
        for (var i = 0; i < bucketCount; i++) {
            this.buckets[i] = null;      // empty bucket
        }
    }

    // Hash function: reads every character and folds it into a bucket number
    hash(key) {
        var total = 0;
        for (var i = 0; i < key.length; i++) {
            total = (total * 31 + charValue(key[i])) % this.bucketCount;
        }
        return total;
    }

    // Insert: compute the bucket, walk its chain, replace if the key exists, else attach at the end
    put(key, record) {
        var index = this.hash(key);
        var entry = this.buckets[index];

        if (entry === null) {
            this.buckets[index] = new OrderEntry(key, record);
            this.size = this.size + 1;
            return;
        }

        var previous = null;
        while (entry !== null) {
            if (entry.key === key) {
                entry.value = record;
                return;
            }
            previous = entry;
            entry = entry.next;
        }
        previous.next = new OrderEntry(key, record);
        this.size = this.size + 1;
    }

    // Lookup: compute the bucket, then traverse that bucket's chain
    get(key) {
        var index = this.hash(key);
        var entry = this.buckets[index];
        while (entry !== null) {
            if (entry.key === key) {
                return entry.value;
            }
            entry = entry.next;
        }
        return null;
    }
}

var orderMap  = new OrderHashMap(BUCKET_COUNT);
var stockList = new StockList();

/* ---------- Stock data (same products as Module 10) ---------- */

stockList.append({ code: "NK-DUNK-41",    name: "Nike Dunk Low Panda",      size: "41", price: 7500, netAvailableStock: 5,  reservedStock: 0 });
stockList.append({ code: "NK-AF1-44",     name: "Nike Air Force 1 '07",     size: "44", price: 6995, netAvailableStock: 4,  reservedStock: 0 });
stockList.append({ code: "AD-SAMBA-42",   name: "Adidas Samba OG",          size: "42", price: 6200, netAvailableStock: 3,  reservedStock: 0 });
stockList.append({ code: "NB-550-43",     name: "New Balance 550 Green",    size: "43", price: 8900, netAvailableStock: 2,  reservedStock: 0 });
stockList.append({ code: "VN-OLDSK-39",   name: "Vans Old Skool Black",     size: "39", price: 3800, netAvailableStock: 6,  reservedStock: 0 });
stockList.append({ code: "CROCS-CLOG-40", name: "Crocs Classic Clog White", size: "40", price: 2500, netAvailableStock: 10, reservedStock: 0 });

/* ---------- Demo orders (as created by Module 10: UNPAID, paidAmount = 0) ---------- */

function makeItem(code, quantity) {
    var product = stockList.findByCode(code);
    return {
        code: product.code,
        name: product.name,
        size: product.size,
        price: product.price,
        quantity: quantity,
        subtotal: product.price * quantity
    };
}

function makeOrder(orderId, customerName, orderType, items, itemCount) {
    var order = {
        orderId: orderId,
        timestamp: buildTimestamp(new Date()),
        customerName: customerName,
        orderType: orderType,
        items: items,
        itemCount: itemCount,
        totalQuantity: 0,
        grossTotal: 0,
        paidAmount: 0,
        status: "UNPAID",
        paymentReference: "",     // filled in by Module 11
        reservation: null         // filled in by Module 11
    };
    for (var i = 0; i < itemCount; i++) {
        order.totalQuantity = order.totalQuantity + items[i].quantity;
        order.grossTotal = order.grossTotal + items[i].subtotal;
    }
    return order;
}

var demoItems1 = [];
demoItems1[0] = makeItem("NK-DUNK-41", 2);
orderMap.put("ORD-2026-901", makeOrder("ORD-2026-901", "Juan Dela Cruz", "Online", demoItems1, 1));

var demoItems2 = [];
demoItems2[0] = makeItem("AD-SAMBA-42", 1);
demoItems2[1] = makeItem("NK-AF1-44", 1);
orderMap.put("ORD-2026-902", makeOrder("ORD-2026-902", "Maria Santos", "Online", demoItems2, 2));

var demoItems3 = [];
demoItems3[0] = makeItem("NB-550-43", 3);       // only 2 in stock -> reservation must fail
orderMap.put("ORD-2026-903", makeOrder("ORD-2026-903", "Pedro Reyes", "Online", demoItems3, 1));

var demoItems4 = [];
demoItems4[0] = makeItem("CROCS-CLOG-40", 1);
orderMap.put("ORD-2026-904", makeOrder("ORD-2026-904", "Ana Lopez", "Walk-In", demoItems4, 1));

/* ---------- DOM References ---------- */

var form       = document.getElementById("reservationForm");
var orderInput = document.getElementById("orderId");
var downInput  = document.getElementById("downPayment");
var refInput   = document.getElementById("referenceNo");
var outputBox  = document.getElementById("outputContainer");

/* ---------- Output helpers ---------- */

function itemsLines(order) {
    var text = "";
    for (var i = 0; i < order.itemCount; i++) {
        var it = order.items[i];
        if (i > 0) { text += "<br>"; }
        text += escapeHtml(it.name) + " (Size " + it.size + ") \u00D7 " + it.quantity;
    }
    return text;
}

// Failed reservation: states the reason and confirms nothing was changed
function showFailure(reasonHtml, nothingMoved) {
    var html = "<p><strong>" + reasonHtml + "</strong></p>";
    if (nothingMoved) {
        html += "<p>No stock was moved.<br>No status change occurred.<br>No payment amount was committed.</p>";
    } else {
        html += "<p>No reservation was made.</p>";
    }
    outputBox.innerHTML = html;
}

/* ---------- Algorithm: Reservation Allocation Algorithm ---------- */

function processReservation() {
    var orderIdText = toUpperText(trimText(orderInput.value));
    var downText    = trimText(downInput.value);
    var refText     = toUpperText(trimText(refInput.value));

    /* --- Input checks (nothing is looked up or changed yet) --- */
    if (orderIdText === "") {
        alert("Order ID is required.");
        orderInput.focus();
        return;
    }
    if (downText === "") {
        alert("Down Payment Amount is required.");
        downInput.focus();
        return;
    }
    var downPayment = Number(downText);
    if (isNaN(downPayment) || !isFinite(downPayment)) {
        alert("Down Payment Amount must be a number.");
        downInput.focus();
        return;
    }
    if (downPayment <= 0) {
        alert("Down Payment Amount must be greater than \u20B10.");
        downInput.focus();
        return;
    }
    var difference = (downPayment * 100) - Math.round(downPayment * 100);
    if (difference > 0.0001 || difference < -0.0001) {
        alert("Down Payment Amount can have at most 2 decimal places.");
        downInput.focus();
        return;
    }
    downPayment = round2(downPayment);

    if (refText === "") {
        alert("Payment Reference Number is required.");
        refInput.focus();
        return;
    }
    if (refText.length > MAX_REFERENCE_LENGTH) {
        alert("Payment Reference Number cannot exceed " + MAX_REFERENCE_LENGTH + " characters.");
        refInput.focus();
        return;
    }
    if (!isValidReference(refText)) {
        alert("Payment Reference Number may only contain letters, numbers and hyphens (no spaces).");
        refInput.focus();
        return;
    }

    /* --- STEP 1: Locate the existing order (hash function -> bucket -> traverse chain) --- */
    var safeOrderId = escapeHtml(orderIdText);
    var bucketIndex = orderMap.hash(orderIdText);
    var order = orderMap.get(orderIdText);

    if (order === null) {
        showFailure("ERROR: Order ID " + safeOrderId + " does not exist.", false);
        return;
    }

    if (order.status === "RESERVED") {
        showFailure("ERROR: Order " + safeOrderId + " is already RESERVED. Another reservation cannot be created.", false);
        return;
    }
    if (order.status !== "UNPAID") {
        showFailure("ERROR: Order " + safeOrderId + " has status " + escapeHtml(order.status) +
                    ". Only UNPAID orders can be reserved.", false);
        return;
    }
    if (order.orderType !== "Online") {
        showFailure("ERROR: Order " + safeOrderId + " is a " + escapeHtml(order.orderType) +
                    " order. Down payment reservation is only for Online orders.", false);
        return;
    }


    /* --- STEP 2: Validate the down payment against the remaining balance --- */
    var remaining = round2(order.grossTotal - order.paidAmount);
    if (downPayment > remaining) {
        showFailure("ERROR: Down Payment " + peso(downPayment) + " exceeds the Remaining Balance of " +
                    peso(remaining) + ".", false);
        return;
    }

    /* Payment reference supplied by staff */
    if (order.paymentReference !== "" && order.paymentReference !== refText) {
        showFailure("ERROR: Order " + safeOrderId + " already has a different Payment Reference recorded.", false);
        return;
    }

    /* Verify ALL ordered items can be reserved (nothing is changed here) */
    var allAvailable = true;
    for (var i = 0; i < order.itemCount; i++) {
        var checkItem = order.items[i];
        var checkStock = stockList.findByCode(checkItem.code);

        if (checkStock === null) {
            allAvailable = false;
        } else if (checkItem.quantity > checkStock.netAvailableStock) {
            allAvailable = false;
        } else {
        }
    }
    if (!allAvailable) {
        showFailure("RESERVATION FAILED \u2014 not all ordered items can be reserved.", true);
        return;
    }

    var reservedAt = buildTimestamp(new Date());

    /* Order.paidAmount += Down_Payment */
    var previousPaid = order.paidAmount;
    order.paidAmount = round2(order.paidAmount + downPayment);

    /* Order.status = RESERVED */
    order.status = "RESERVED";
    order.paymentReference = refText;

    /* Move each item's quantity from Net_Available_Stock to Reserved_Stock */
    var allocations = [];
    for (var j = 0; j < order.itemCount; j++) {
        var orderItem = order.items[j];
        var stockItem = stockList.findByCode(orderItem.code);

        var availableBefore = stockItem.netAvailableStock;
        var reservedBefore  = stockItem.reservedStock;

        stockItem.netAvailableStock = stockItem.netAvailableStock - orderItem.quantity;
        stockItem.reservedStock     = stockItem.reservedStock + orderItem.quantity;

        allocations[j] = {
            name: orderItem.name,
            size: orderItem.size,
            quantity: orderItem.quantity,
            availableBefore: availableBefore,
            availableAfter: stockItem.netAvailableStock,
            reservedBefore: reservedBefore,
            reservedAfter: stockItem.reservedStock
        };

    }

    /* Remaining balance */
    var balanceDue = round2(order.grossTotal - order.paidAmount);

    /* --- Save the reservation record --- */
    order.reservation = {
        paymentReference: refText,
        downPayment: downPayment,
        totalPaid: order.paidAmount,
        balanceDue: balanceDue,
        timestamp: reservedAt
    };

    renderSlip(order, downPayment, previousPaid, balanceDue, allocations, reservedAt);
    renderTree();

    orderInput.value = "";
    downInput.value = "";
    refInput.value = "";
}

form.addEventListener("submit", function (e) {
    e.preventDefault();
    processReservation();
});

/* ---------- Output: Reservation slip with remaining balance calculation ---------- */

function renderSlip(order, downPayment, previousPaid, balanceDue, allocations, reservedAt) {
    var html = "<h3>Reservation Slip</h3>";
    html += "<table>" +
        "<tr><td>Order ID</td><td>" + order.orderId + "</td></tr>" +
        "<tr><td>Customer</td><td>" + escapeHtml(order.customerName) + "</td></tr>" +
        "<tr><td>Order Type</td><td>" + escapeHtml(order.orderType) + "</td></tr>" +
        "<tr><td>Items</td><td>" + itemsLines(order) + "</td></tr>" +
        "<tr><td>Gross Total</td><td>" + peso(order.grossTotal) + "</td></tr>";
    if (previousPaid > 0) {
        html += "<tr><td>Previous Paid</td><td>" + peso(previousPaid) + "</td></tr>";
    }
    html += "<tr><td>Down Payment</td><td>" + peso(downPayment) + "</td></tr>" +
        "<tr><td>Total Paid</td><td>" + peso(order.paidAmount) + "</td></tr>" +
        "<tr><td>Remaining Balance Due</td><td>" + peso(balanceDue) + "</td></tr>" +
        "<tr><td>Payment Reference</td><td>" + escapeHtml(order.paymentReference) + "</td></tr>" +
        "<tr><td>Reservation Date</td><td>" + reservedAt + "</td></tr>" +
        '<tr><td>Order Status</td><td><span class="tag ok">' + order.status + "</span></td></tr>" +
    "</table>";

    html += '<h3 class="spaced">Stock Allocation</h3><table class="grid-table">' +
            "<tr><th>Item</th><th>Reserved Qty</th><th>Available Before</th><th>Available After</th>" +
            "<th>Reserved Before</th><th>Reserved After</th></tr>";
    for (var i = 0; i < order.itemCount; i++) {
        var a = allocations[i];
        html += "<tr>" +
            "<td>" + escapeHtml(a.name) + " (Size " + a.size + ")</td>" +
            '<td class="num">' + a.quantity + "</td>" +
            '<td class="num">' + a.availableBefore + "</td>" +
            '<td class="num">' + a.availableAfter + "</td>" +
            '<td class="num">' + a.reservedBefore + "</td>" +
            '<td class="num">' + a.reservedAfter + "</td></tr>";
    }
    html += "</table>";

    outputBox.innerHTML = html;
}

/* ---------- Order & Stock Directory ---------- */

function renderTree() {
    var out = "ORDER HASH MAP  (key: Order ID | buckets: " + orderMap.bucketCount + " | orders: " + orderMap.size + ")\n";

    for (var b = 0; b < orderMap.bucketCount; b++) {
        var entry = orderMap.buckets[b];
        if (entry === null) {
            out += "|-- Bucket [" + b + "]  (empty)\n";
            continue;
        }
        out += "|-- Bucket [" + b + "]\n";

        while (entry !== null) {
            var order = entry.value;
            out += "|     |-- " + order.orderId + "  [" + order.status + "]  " + order.customerName + "\n";
            out += "|     |     |-- Order Type   : " + order.orderType + "\n";
            for (var i = 0; i < order.itemCount; i++) {
                var it = order.items[i];
                out += "|     |     |-- Item         : " + it.name + " Size " + it.size + " x" + it.quantity + "\n";
            }
            out += "|     |     |-- Gross Total  : " + peso(order.grossTotal) + "\n";
            out += "|     |     |-- Paid Amount  : " + peso(order.paidAmount) + "\n";
            out += "|     |     |-- Balance Due  : " + peso(order.grossTotal - order.paidAmount) + "\n";
            if (order.paymentReference === "") {
                out += "|     |     `-- Payment Ref  : (none yet)\n";
            } else {
                out += "|     |     `-- Payment Ref  : " + order.paymentReference + "\n";
            }
            entry = entry.next;
        }
    }

    out += "\nSTOCK LINKED LIST\n";
    out += "HEAD\n";
    var node = stockList.head;
    while (node !== null) {
        var branch = "|-- ";
        if (node.next === null) {
            branch = "`-- ";
        }
        out += branch + node.item.code + "  " + node.item.name + " (Size " + node.item.size + ")" +
               "  | Net Available Stock: " + node.item.netAvailableStock +
               "  | Reserved Stock: " + node.item.reservedStock + "\n";
        node = node.next;
    }

    treeView.textContent = out;
}

outputBox.innerHTML = '<p class="empty-note">No reservation processed yet. Enter an existing Order ID, Down Payment Amount, ' +
    'and Payment Reference Number, then press <strong>Reserve Stock</strong>.<br>' +
    'Demo orders from Module 10: ORD-2026-901, ORD-2026-902 (multiple items), ORD-2026-903 (insufficient stock), ORD-2026-904 (Walk-In).</p>';
renderTree();
