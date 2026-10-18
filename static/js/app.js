// =========================================================
// COURIERX AUTHENTICATION & GLOBAL STATE
// =========================================================
window.currentUser = null;
window.selectedAuthRole = "Customer";

document.addEventListener("DOMContentLoaded", () => {
    setupAuthPortal();
    setupNavigation();
    setupUsersView();
    setupParcelsView();
    setupBranchesView();
    setupShipmentsView();
    setupVehiclesView();
    setupCustomersView();
    setupEmployeesView();
    setupPaymentsView();
    setupFeedbackView();
    setupPaymentQrModal();
    setupAssignShipmentModal();
    setupUpdateTrackingModal();
    setupOperationalAlerts();
    setupParcelModal();
    setupTracking();

    // Verify session state on initial load
    checkAuthSession();
});


// =========================================================
// DASHBOARD
// =========================================================

async function loadDashboard() {
    try {
        const user = window.currentUser;
        if (user && (user.role === "Customer" || user.role === "Seller/Vendor")) {
            const response = await fetch("/api/customer/dashboard-stats");
            if (!response.ok) throw new Error("Failed to load customer dashboard");
            const data = await response.json();
            updateCustomerDashboard(data);
            return;
        }

        if (user && user.role === "Courier Partner") {
            const response = await fetch("/api/courier/dashboard-stats");
            if (!response.ok) throw new Error("Failed to load courier dashboard");
            const data = await response.json();
            updateCourierDashboard(data);
            return;
        }

        // Administrator / Global fallback
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Failed to load dashboard");
        }

        const data = await response.json();

        resetDashboardLabels();
        updateStats(data.stats);
        updateRecentParcels(data.recent_parcels);
    } catch (error) {
        console.error("Dashboard error:", error);
    }
}


function resetDashboardLabels() {
    const labels = document.querySelectorAll(".stat-card .stat-content span");
    if (labels.length >= 4) {
        labels[0].textContent = "Total Parcels";
        labels[1].textContent = "In Transit";
        labels[2].textContent = "Delivered";
        labels[3].textContent = "Customers";
    }
}


function updateCustomerDashboard(data) {
    const totalParcels = document.getElementById("totalParcels");
    const inTransit = document.getElementById("inTransit");
    const delivered = document.getElementById("delivered");
    const totalCustomers = document.getElementById("totalCustomers");
    const labels = document.querySelectorAll(".stat-card .stat-content span");

    if (labels.length >= 4) {
        labels[0].textContent = "My Parcels";
        labels[1].textContent = "In Transit";
        labels[2].textContent = "Delivered";
        labels[3].textContent = "Total Spent";
    }

    if (totalParcels) totalParcels.textContent = (data.total_sent || 0) + (data.total_received || 0);
    if (inTransit) inTransit.textContent = data.in_transit || 0;
    if (delivered) delivered.textContent = data.delivered || 0;
    if (totalCustomers) totalCustomers.textContent = `₹${Number(data.total_spent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const tableBody = document.getElementById("recentParcels");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    const parcels = data.recent_parcels || [];
    if (parcels.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="empty-state">No parcel records booked yet</td></tr>`;
        return;
    }

    parcels.forEach(p => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>${escapeHtml(p.tracking_number)}</strong></td>
            <td>${escapeHtml(p.origin_branch)} → ${escapeHtml(p.destination_branch)}</td>
            <td>${createStatusBadge(p.status)}</td>
            <td>${escapeHtml(p.booking_date)}</td>
        `;
        tableBody.appendChild(row);
    });
}


function updateCourierDashboard(data) {
    const totalParcels = document.getElementById("totalParcels");
    const inTransit = document.getElementById("inTransit");
    const delivered = document.getElementById("delivered");
    const totalCustomers = document.getElementById("totalCustomers");
    const labels = document.querySelectorAll(".stat-card .stat-content span");

    if (labels.length >= 4) {
        labels[0].textContent = "Assigned Deliveries";
        labels[1].textContent = "Active Transit";
        labels[2].textContent = "Delivered";
        labels[3].textContent = "Partner Rating";
    }

    if (totalParcels) totalParcels.textContent = data.total_shipments || 0;
    if (inTransit) inTransit.textContent = data.active_deliveries || 0;
    if (delivered) delivered.textContent = data.completed_deliveries || 0;
    if (totalCustomers) totalCustomers.textContent = `${data.avg_rating || 0} ★ (${data.total_reviews || 0})`;

    const tableBody = document.getElementById("recentParcels");
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state" style="padding: 24px; text-align: center;">
                    <i class="fa-solid fa-truck-fast" style="font-size: 26px; color: #38bdf8; margin-bottom: 8px; display: block;"></i>
                    <span style="color: #cbd5e1; font-weight: 600;">Delivery Route Active</span>
                    <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Navigate to the <strong>Shipments</strong> view to inspect assigned routes and update transit checkpoints.</p>
                </td>
            </tr>
        `;
    }
}


function updateStats(stats) {
    const totalParcels = document.getElementById("totalParcels");
    const inTransit = document.getElementById("inTransit");
    const delivered = document.getElementById("delivered");
    const totalCustomers = document.getElementById("totalCustomers");

    if (totalParcels) {
        totalParcels.textContent = stats.total_parcels;
    }

    if (inTransit) {
        inTransit.textContent = stats.in_transit;
    }

    if (delivered) {
        delivered.textContent = stats.delivered;
    }

    if (totalCustomers) {
        totalCustomers.textContent = stats.total_customers;
    }
}


function updateRecentParcels(parcels) {
    const tableBody = document.getElementById("recentParcels");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!parcels || parcels.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="empty-state">
                    No parcel records yet
                </td>
            </tr>
        `;
        return;
    }

    parcels.forEach(parcel => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <strong>${escapeHtml(parcel.tracking_number)}</strong>
            </td>

            <td>
                ${escapeHtml(parcel.customer_name)}
            </td>

            <td>
                ${createStatusBadge(parcel.status)}
            </td>

            <td>
                ${escapeHtml(parcel.booking_date)}
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function createStatusBadge(status) {
    let className = "status-pending";

    if (status === "In Transit") {
        className = "status-transit";
    } else if (status === "Out for Delivery") {
        className = "status-out";
    } else if (status === "Delivered") {
        className = "status-delivered";
    }

    return `
        <span class="status-badge ${className}">
            ${escapeHtml(status)}
        </span>
    `;
}


// =========================================================
// CUSTOMERS
// =========================================================

async function loadCustomers() {
    try {
        const response = await fetch("/api/customers");

        if (!response.ok) {
            throw new Error("Could not load customers");
        }

        const customers = await response.json();

        const senderSelect =
            document.getElementById("senderId");

        const receiverSelect =
            document.getElementById("receiverId");

        if (!senderSelect || !receiverSelect) {
            return;
        }

        senderSelect.innerHTML = `
            <option value="">Select sender</option>
        `;

        receiverSelect.innerHTML = `
            <option value="">Select receiver</option>
        `;

        customers.forEach(customer => {
            const label =
                `${customer.name} — ${customer.phone || "No phone"}`;

            const senderOption =
                document.createElement("option");

            senderOption.value =
                customer.customer_id;

            senderOption.textContent =
                label;

            senderSelect.appendChild(senderOption);


            const receiverOption =
                document.createElement("option");

            receiverOption.value =
                customer.customer_id;

            receiverOption.textContent =
                label;

            receiverSelect.appendChild(receiverOption);
        });

    } catch (error) {
        console.error(
            "Customer loading error:",
            error
        );
    }
}


// =========================================================
// BRANCHES
// =========================================================

async function loadBranches() {
    try {
        const response =
            await fetch("/api/branches?status=Active");

        if (!response.ok) {
            throw new Error(
                "Could not load branches"
            );
        }

        const branches =
            await response.json();

        const originSelect =
            document.getElementById(
                "originBranchId"
            );

        const destinationSelect =
            document.getElementById(
                "destinationBranchId"
            );

        if (
            !originSelect ||
            !destinationSelect
        ) {
            return;
        }

        originSelect.innerHTML = `
            <option value="">
                Select origin branch
            </option>
        `;

        destinationSelect.innerHTML = `
            <option value="">
                Select destination branch
            </option>
        `;

        branches.forEach(branch => {
            const branchName =
                branch.branch_name ||
                branch.name ||
                "Unnamed Branch";

            const city =
                branch.city || "";

            const state =
                branch.state || "";

            const location =
                [city, state]
                    .filter(Boolean)
                    .join(", ");

            const label =
                location
                    ? `${branchName} — ${location}`
                    : branchName;


            const originOption =
                document.createElement("option");

            originOption.value =
                branch.branch_id;

            originOption.textContent =
                label;

            originSelect.appendChild(
                originOption
            );


            const destinationOption =
                document.createElement("option");

            destinationOption.value =
                branch.branch_id;

            destinationOption.textContent =
                label;

            destinationSelect.appendChild(
                destinationOption
            );
        });

    } catch (error) {
        console.error(
            "Branch loading error:",
            error
        );
    }
}


// =========================================================
// NEW PARCEL MODAL
// =========================================================

function setupParcelModal() {
    const modal =
        document.getElementById("parcelModal");

    const openButton =
        document.getElementById("newParcelButton");

    const parcelsNewButton =
        document.getElementById("parcelsNewButton");

    const closeButton =
        document.getElementById("closeParcelModal");

    const cancelButton =
        document.getElementById("cancelParcel");

    const form =
        document.getElementById("parcelForm");

    if (!modal || !form) {
        return;
    }

    const openModal = () => {
        modal.classList.add("show");

        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        clearFormMessage();
        prefillSenderForCustomer();
    };

    if (openButton) {
        openButton.addEventListener("click", openModal);
    }

    if (parcelsNewButton) {
        parcelsNewButton.addEventListener("click", openModal);
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeParcelModal
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            closeParcelModal
        );
    }

    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                closeParcelModal();
            }
        }
    );

    form.addEventListener(
        "submit",
        createParcel
    );

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                modal.classList.contains("show")
            ) {
                closeParcelModal();
            }
        }
    );
}


function closeParcelModal() {
    const modal =
        document.getElementById("parcelModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("show");

    modal.setAttribute(
        "aria-hidden",
        "true"
    );

    clearFormMessage();
}


// =========================================================
// CREATE PARCEL
// =========================================================

async function createParcel(event) {
    event.preventDefault();

    const button =
        document.getElementById(
            "createParcelButton"
        );

    const form =
        document.getElementById(
            "parcelForm"
        );

    if (!button || !form) {
        return;
    }

    const formData =
        new FormData(form);


    /*
     * IMPORTANT:
     *
     * The HTML form contains sender/receiver
     * DETAILS, not sender_id / receiver_id.
     *
     * The backend will find/create the
     * corresponding Customer records.
     */

    const parcel = {
        sender_name:
            (formData.get("sender_name") || "")
                .trim(),

        sender_email:
            (formData.get("sender_email") || "")
                .trim(),

        sender_phone:
            (formData.get("sender_phone") || "")
                .trim(),

        sender_address:
            (formData.get("sender_address") || "")
                .trim(),


        receiver_name:
            (formData.get("receiver_name") || "")
                .trim(),

        receiver_email:
            (formData.get("receiver_email") || "")
                .trim(),

        receiver_phone:
            (formData.get("receiver_phone") || "")
                .trim(),

        receiver_address:
            (formData.get("receiver_address") || "")
                .trim(),


        origin_branch_id:
            Number(
                formData.get(
                    "origin_branch_id"
                )
            ),

        destination_branch_id:
            Number(
                formData.get(
                    "destination_branch_id"
                )
            ),

        weight:
            Number(
                formData.get("weight")
            ),

        parcel_type:
            formData.get("parcel_type") || "",

        shipping_cost:
            Number(
                formData.get("shipping_cost")
            )
    };


    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (
        !parcel.sender_name ||
        !parcel.sender_email ||
        !parcel.sender_phone ||
        !parcel.sender_address ||

        !parcel.receiver_name ||
        !parcel.receiver_email ||
        !parcel.receiver_phone ||
        !parcel.receiver_address ||

        !parcel.origin_branch_id ||
        !parcel.destination_branch_id ||

        !parcel.weight ||
        !parcel.parcel_type ||

        Number.isNaN(parcel.shipping_cost) ||
        parcel.shipping_cost < 0
    ) {
        showFormMessage(
            "Please fill in all required fields.",
            "error"
        );

        return;
    }


    if (
        parcel.origin_branch_id ===
        parcel.destination_branch_id
    ) {
        showFormMessage(
            "Origin and destination branches must be different.",
            "error"
        );

        return;
    }


    // -----------------------------------------------------
    // LOADING STATE
    // -----------------------------------------------------

    button.disabled = true;

    button.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Creating...
    `;


    try {

        const response =
            await fetch(
                "/api/parcels",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            parcel
                        )
                }
            );


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error ||
                "Failed to create parcel"
            );
        }


        // -------------------------------------------------
        // SUCCESS
        // -------------------------------------------------

        if (data.auto_dispatched) {
            showFormMessage(
                `Parcel created & auto-dispatched with ${data.vehicle_number} (${data.employee_name})! Tracking ID: ${data.tracking_number}`,
                "success"
            );
            showToast(
                "Auto-Dispatched",
                `${data.tracking_number} assigned to ${data.vehicle_number}`
            );
        } else {
            showFormMessage(
                `Parcel created successfully! Status: Awaiting vehicle/driver assignment. Tracking: ${data.tracking_number}`,
                "success"
            );
            showToast(
                "Parcel Created",
                `Tracking ID: ${data.tracking_number} (Awaiting assignment)`
            );
        }

        form.reset();

        await loadDashboard();
        await loadAlerts();
        await loadCustomers();
        await loadParcels();


        setTimeout(
            () => {
                closeParcelModal();
            },
            1800
        );


    } catch (error) {

        console.error(
            "Parcel creation error:",
            error
        );

        showFormMessage(
            error.message ||
            "Failed to create parcel.",
            "error"
        );


    } finally {

        button.disabled = false;

        button.innerHTML = `
            <i class="fa-solid fa-box"></i>
            Create Parcel
        `;
    }
}


// =========================================================
// TRACKING
// =========================================================

function setupTracking() {
    const button =
        document.getElementById(
            "trackButton"
        );

    const input =
        document.getElementById(
            "trackingNumber"
        );

    if (!button || !input) {
        return;
    }

    button.addEventListener(
        "click",
        trackParcel
    );

    input.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                trackParcel();
            }
        }
    );
}


async function trackParcel() {
    const input =
        document.getElementById(
            "trackingNumber"
        );

    if (!input) {
        return;
    }

    const trackingNumber =
        input.value.trim();

    if (!trackingNumber) {
        showToast(
            "Tracking Required",
            "Enter a tracking number first."
        );

        input.focus();

        return;
    }

    try {

        const response =
            await fetch(
                `/api/parcels/${encodeURIComponent(
                    trackingNumber
                )}`
            );


        const data =
            await response.json();


        if (!response.ok) {
            throw new Error(
                data.error ||
                "Parcel not found"
            );
        }


        showTrackingDetails(data);

    } catch (error) {

        console.error(
            "Tracking error:",
            error
        );

        showToast(
            "Tracking Error",
            error.message
        );
    }
}


// =========================================================
// TRACKING DETAILS
// =========================================================

function showTrackingDetails(parcel) {
    removeTrackingModal();

    const history =
        parcel.tracking_history || [];

    const modal =
        document.createElement("div");

    modal.id =
        "trackingDetailsModal";

    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(2, 6, 23, .82);
        backdrop-filter: blur(14px);
        overflow-y: auto;
    `;


    const statusColor =
        getStatusColor(
            parcel.status
        );


    modal.innerHTML = `
        <div style="
            width:min(1050px,100%);
            max-height:90vh;
            overflow-y:auto;
            background:linear-gradient(
                145deg,
                #101b31,
                #08101f
            );
            border:1px solid rgba(148,163,184,.18);
            border-radius:28px;
            box-shadow:0 30px 100px rgba(0,0,0,.55);
            color:#f8fafc;
        ">

            <div style="
                padding:32px;
                border-bottom:1px solid
                    rgba(148,163,184,.14);
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                gap:20px;
            ">

                <div>
                    <div style="
                        font-size:12px;
                        font-weight:800;
                        letter-spacing:3px;
                        color:#94a3b8;
                        margin-bottom:10px;
                    ">
                        SHIPMENT DETAILS
                    </div>

                    <h2 style="
                        margin:0;
                        font-size:32px;
                        font-weight:800;
                    ">
                        ${escapeHtml(
                            parcel.tracking_number
                        )}
                    </h2>

                    <div style="
                        margin-top:8px;
                        color:#94a3b8;
                        font-size:15px;
                    ">
                        Booked on
                        ${escapeHtml(
                            parcel.booking_date
                        )}
                    </div>
                </div>

                <div style="
                    display:inline-flex;
                    align-items:center;
                    gap:9px;
                    padding:11px 18px;
                    border-radius:999px;
                    background:rgba(59,130,246,.12);
                    color:${statusColor};
                    font-weight:700;
                ">
                    <span style="
                        width:10px;
                        height:10px;
                        border-radius:50%;
                        background:currentColor;
                    "></span>

                    ${escapeHtml(
                        parcel.status
                    )}
                </div>

            </div>


            <div style="
                display:grid;
                grid-template-columns:
                    repeat(3,1fr);
                gap:16px;
                padding:28px 32px 10px;
            ">

                ${trackingInfoCard(
                    "SENDER",
                    parcel.sender_name,
                    parcel.sender_phone
                )}

                ${trackingInfoCard(
                    "RECEIVER",
                    parcel.receiver_name,
                    parcel.receiver_phone
                )}

                ${trackingInfoCard(
                    "PARCEL",
                    parcel.parcel_type,
                    `${parcel.weight} kg`
                )}

                ${trackingInfoCard(
                    "SHIPPING COST",
                    `₹${parcel.shipping_cost}`,
                    "Shipping charge"
                )}

                ${trackingInfoCard(
                    "ORIGIN",
                    parcel.origin_branch,
                    formatLocation(
                        parcel.origin_city,
                        parcel.origin_state
                    )
                )}

                ${trackingInfoCard(
                    "DESTINATION",
                    parcel.destination_branch,
                    formatLocation(
                        parcel.destination_city,
                        parcel.destination_state
                    )
                )}

            </div>


            <div style="
                margin:22px 32px;
                padding:26px;
                border-radius:22px;
                background:linear-gradient(
                    135deg,
                    rgba(37,99,235,.13),
                    rgba(99,102,241,.08)
                );
                border:1px solid
                    rgba(99,102,241,.25);
            ">

                <div style="
                    font-size:12px;
                    font-weight:800;
                    letter-spacing:2.5px;
                    color:#94a3b8;
                    margin-bottom:20px;
                ">
                    SHIPMENT ROUTE
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:
                        1fr 80px 1fr;
                    align-items:center;
                    gap:18px;
                ">

                    <div>
                        <div style="
                            color:#64748b;
                            font-size:13px;
                            margin-bottom:7px;
                        ">
                            ORIGIN
                        </div>

                        <strong style="
                            font-size:21px;
                        ">
                            ${escapeHtml(
                                parcel.origin_branch
                            )}
                        </strong>

                        <div style="
                            color:#94a3b8;
                            margin-top:5px;
                        ">
                            ${escapeHtml(
                                formatLocation(
                                    parcel.origin_city,
                                    parcel.origin_state
                                )
                            )}
                        </div>
                    </div>


                    <div style="
                        width:58px;
                        height:58px;
                        margin:auto;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:linear-gradient(
                            135deg,
                            #3b82f6,
                            #7c3aed
                        );
                        font-size:25px;
                    ">
                        →
                    </div>


                    <div style="
                        text-align:right;
                    ">
                        <div style="
                            color:#64748b;
                            font-size:13px;
                            margin-bottom:7px;
                        ">
                            DESTINATION
                        </div>

                        <strong style="
                            font-size:21px;
                        ">
                            ${escapeHtml(
                                parcel.destination_branch
                            )}
                        </strong>

                        <div style="
                            color:#94a3b8;
                            margin-top:5px;
                        ">
                            ${escapeHtml(
                                formatLocation(
                                    parcel.destination_city,
                                    parcel.destination_state
                                )
                            )}
                        </div>
                    </div>

                </div>

            </div>


            <div style="
                padding:8px 32px 34px;
            ">

                <div style="
                    font-size:12px;
                    font-weight:800;
                    letter-spacing:2.5px;
                    color:#94a3b8;
                    margin-bottom:18px;
                ">
                    TRACKING HISTORY
                </div>

                ${
                    history.length > 0
                        ? history
                            .map(
                                (update, index) =>
                                    createTrackingTimelineItem(
                                        update,
                                        index,
                                        history.length
                                    )
                            )
                            .join("")
                        : `
                            <div style="
                                padding:25px;
                                border-radius:18px;
                                background:rgba(
                                    15,23,42,.65
                                );
                                border:1px solid
                                    rgba(
                                        148,
                                        163,
                                        184,
                                        .12
                                    );
                                color:#94a3b8;
                            ">
                                No tracking updates
                                recorded yet.
                            </div>
                        `
                }

            </div>


            <div style="
                padding:20px 32px 28px;
                border-top:1px solid
                    rgba(148,163,184,.12);
                display:flex;
                justify-content:flex-end;
            ">

                <button
                    id="closeTrackingDetails"
                    style="
                        border:1px solid
                            rgba(148,163,184,.2);
                        background:
                            rgba(30,41,59,.7);
                        color:#e2e8f0;
                        padding:12px 22px;
                        border-radius:12px;
                        font-weight:700;
                        cursor:pointer;
                    "
                >
                    Close
                </button>

            </div>

        </div>
    `;


    document.body.appendChild(modal);


    const closeButton =
        document.getElementById(
            "closeTrackingDetails"
        );

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            removeTrackingModal
        );
    }


    modal.addEventListener(
        "click",
        event => {
            if (event.target === modal) {
                removeTrackingModal();
            }
        }
    );


    document.addEventListener(
        "keydown",
        handleTrackingEscape
    );
}


// =========================================================
// TRACKING INFO CARD
// =========================================================

function trackingInfoCard(
    title,
    main,
    secondary
) {
    return `
        <div style="
            padding:23px;
            border-radius:20px;
            background:rgba(20,32,54,.72);
            border:1px solid
                rgba(148,163,184,.12);
            min-height:95px;
        ">

            <div style="
                color:#7183a0;
                font-size:12px;
                font-weight:800;
                letter-spacing:2px;
                margin-bottom:10px;
            ">
                ${escapeHtml(title)}
            </div>

            <div style="
                color:#f8fafc;
                font-size:20px;
                font-weight:750;
            ">
                ${escapeHtml(
                    main ?? "—"
                )}
            </div>

            <div style="
                color:#8494ad;
                margin-top:5px;
                font-size:14px;
            ">
                ${escapeHtml(
                    secondary ?? ""
                )}
            </div>

        </div>
    `;
}


// =========================================================
// TRACKING TIMELINE
// =========================================================

function createTrackingTimelineItem(
    update,
    index,
    total
) {
    const isLatest =
        index === total - 1;

    const statusColor =
        getStatusColor(
            update.status
        );

    return `
        <div style="
            display:grid;
            grid-template-columns:36px 1fr;
            column-gap:16px;
        ">

            <div style="
                display:flex;
                flex-direction:column;
                align-items:center;
            ">

                <div style="
                    width:18px;
                    height:18px;
                    margin-top:4px;
                    border-radius:50%;
                    background:${statusColor};
                    box-shadow:
                        0 0 0 6px
                        rgba(59,130,246,.10);
                    flex-shrink:0;
                "></div>

                ${
                    index < total - 1
                        ? `
                            <div style="
                                width:2px;
                                flex:1;
                                min-height:65px;
                                background:
                                    linear-gradient(
                                        180deg,
                                        rgba(
                                            96,
                                            165,
                                            250,
                                            .45
                                        ),
                                        rgba(
                                            96,
                                            165,
                                            250,
                                            .08
                                        )
                                    );
                                margin-top:5px;
                            "></div>
                        `
                        : ""
                }

            </div>


            <div style="
                padding-bottom:
                    ${
                        index < total - 1
                            ? "25px"
                            : "4px"
                    };
            ">

                <div style="
                    display:flex;
                    justify-content:
                        space-between;
                    align-items:flex-start;
                    gap:15px;
                ">

                    <div>

                        <div style="
                            display:flex;
                            align-items:center;
                            gap:10px;
                        ">

                            <strong style="
                                font-size:18px;
                                color:
                                    ${
                                        isLatest
                                            ? "#f8fafc"
                                            : "#cbd5e1"
                                    };
                            ">
                                ${escapeHtml(
                                    update.status
                                )}
                            </strong>

                            ${
                                isLatest
                                    ? `
                                        <span style="
                                            font-size:10px;
                                            padding:4px 8px;
                                            border-radius:999px;
                                            background:
                                                rgba(
                                                    59,
                                                    130,
                                                    246,
                                                    .15
                                                );
                                            color:#8ab4ff;
                                            font-weight:800;
                                        ">
                                            LATEST
                                        </span>
                                    `
                                    : ""
                            }

                        </div>


                        <div style="
                            margin-top:7px;
                            color:#94a3b8;
                            font-size:14px;
                        ">
                            <i class="
                                fa-solid
                                fa-location-dot
                            "></i>

                            ${escapeHtml(
                                update.location
                            )}
                        </div>


                        ${
                            update.employee_name
                                ? `
                                    <div style="
                                        margin-top:5px;
                                        color:#64748b;
                                        font-size:13px;
                                    ">
                                        Handled by
                                        ${escapeHtml(
                                            update.employee_name
                                        )}
                                    </div>
                                `
                                : ""
                        }

                    </div>


                    <div style="
                        color:#64748b;
                        font-size:13px;
                        white-space:nowrap;
                    ">
                        ${escapeHtml(
                            update.update_time
                        )}
                    </div>

                </div>

            </div>

        </div>
    `;
}


// =========================================================
// STATUS HELPERS
// =========================================================

function getStatusColor(status) {
    if (status === "Delivered") {
        return "#34d399";
    }

    if (status === "Out for Delivery") {
        return "#a78bfa";
    }

    if (status === "In Transit") {
        return "#60a5fa";
    }

    return "#fbbf24";
}


function getTrackingStatusClass(status) {
    if (status === "Delivered") {
        return "delivered";
    }

    if (status === "Out for Delivery") {
        return "out";
    }

    if (status === "In Transit") {
        return "transit";
    }

    return "pending";
}


// =========================================================
// LOCATION
// =========================================================

function formatLocation(
    city,
    state
) {
    const parts = [];

    if (city) {
        parts.push(city);
    }

    if (state) {
        parts.push(state);
    }

    return parts.length
        ? parts.join(", ")
        : "Location unavailable";
}


// =========================================================
// REMOVE TRACKING MODAL
// =========================================================

function removeTrackingModal() {
    const modal =
        document.getElementById(
            "trackingDetailsModal"
        );

    if (modal) {
        modal.remove();
    }

    document.removeEventListener(
        "keydown",
        handleTrackingEscape
    );
}


function handleTrackingEscape(event) {
    if (event.key === "Escape") {
        removeTrackingModal();
    }
}


// =========================================================
// FORM MESSAGES
// =========================================================

function showFormMessage(
    text,
    type
) {
    const message =
        document.getElementById(
            "parcelFormMessage"
        );

    if (!message) {
        return;
    }

    message.textContent =
        text;

    message.className =
        `form-message show ${type}`;
}


function clearFormMessage() {
    const message =
        document.getElementById(
            "parcelFormMessage"
        );

    if (!message) {
        return;
    }

    message.textContent = "";

    message.className =
        "form-message";
}


// =========================================================
// TOAST
// =========================================================

function showToast(
    title,
    message
) {
    const toast =
        document.getElementById(
            "toast"
        );

    const toastTitle =
        document.getElementById(
            "toastTitle"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );

    if (
        !toast ||
        !toastTitle ||
        !toastMessage
    ) {
        return;
    }

    toastTitle.textContent =
        title;

    toastMessage.textContent =
        message;

    toast.classList.add("show");

    setTimeout(
        () => {
            toast.classList.remove(
                "show"
            );
        },
        4000
    );
}


// =========================================================
// HTML ESCAPING
// =========================================================

function escapeHtml(value) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// =========================================================
// NAVIGATION
// =========================================================

function setupNavigation() {
    const navDashboard = document.getElementById("navDashboard");
    const navParcels = document.getElementById("navParcels");
    const navShipments = document.getElementById("navShipments");
    const navTracking = document.getElementById("navTracking");
    const navVehicles = document.getElementById("navVehicles");
    const navCustomers = document.getElementById("navCustomers");
    const navBranches = document.getElementById("navBranches");
    const navEmployees = document.getElementById("navEmployees");
    const navPayments = document.getElementById("navPayments");
    const navFeedback = document.getElementById("navFeedback");
    const navUsers = document.getElementById("navUsers");
    const viewAllButton = document.getElementById("viewAllParcelsButton");
    const assignShipmentButton = document.getElementById("assignShipmentButton");
    const shipmentsAssignButton = document.getElementById("shipmentsAssignButton");
    const paymentButton = document.getElementById("paymentButton");

    if (navDashboard) {
        navDashboard.addEventListener("click", event => {
            event.preventDefault();
            switchToView("dashboard");
        });
    }

    if (navParcels) {
        navParcels.addEventListener("click", event => {
            event.preventDefault();
            switchToView("parcels");
        });
    }

    if (navShipments) {
        navShipments.addEventListener("click", event => {
            event.preventDefault();
            switchToView("shipments");
        });
    }

    if (navTracking) {
        navTracking.addEventListener("click", event => {
            event.preventDefault();
            switchToView("dashboard");
            const trackingInput = document.getElementById("trackingNumber");
            if (trackingInput) {
                trackingInput.scrollIntoView({ behavior: "smooth", block: "center" });
                trackingInput.focus();
            }
        });
    }

    if (navVehicles) {
        navVehicles.addEventListener("click", event => {
            event.preventDefault();
            switchToView("vehicles");
        });
    }

    if (navCustomers) {
        navCustomers.addEventListener("click", event => {
            event.preventDefault();
            switchToView("customers");
        });
    }

    if (navBranches) {
        navBranches.addEventListener("click", event => {
            event.preventDefault();
            switchToView("branches");
        });
    }

    if (navEmployees) {
        navEmployees.addEventListener("click", event => {
            event.preventDefault();
            switchToView("employees");
        });
    }

    if (navPayments) {
        navPayments.addEventListener("click", event => {
            event.preventDefault();
            switchToView("payments");
        });
    }

    if (navFeedback) {
        navFeedback.addEventListener("click", event => {
            event.preventDefault();
            switchToView("feedback");
        });
    }

    if (navUsers) {
        navUsers.addEventListener("click", event => {
            event.preventDefault();
            switchToView("users");
        });
    }

    if (paymentButton) {
        paymentButton.addEventListener("click", event => {
            event.preventDefault();
            switchToView("payments");
        });
    }

    if (viewAllButton) {
        viewAllButton.addEventListener("click", event => {
            event.preventDefault();
            switchToView("parcels");
        });
    }

    if (assignShipmentButton) {
        assignShipmentButton.addEventListener("click", event => {
            event.preventDefault();
            openAssignShipmentModal();
        });
    }

    if (shipmentsAssignButton) {
        shipmentsAssignButton.addEventListener("click", event => {
            event.preventDefault();
            openAssignShipmentModal();
        });
    }

    const updateTrackingButton = document.getElementById("updateTrackingButton");
    if (updateTrackingButton) {
        updateTrackingButton.addEventListener("click", event => {
            event.preventDefault();
            openUpdateTrackingModal();
        });
    }
}


function switchToView(viewName) {
    const views = {
        dashboard: document.getElementById("dashboardView"),
        parcels: document.getElementById("parcelsView"),
        shipments: document.getElementById("shipmentsView"),
        vehicles: document.getElementById("vehiclesView"),
        customers: document.getElementById("customersView"),
        branches: document.getElementById("branchesView"),
        employees: document.getElementById("employeesView"),
        payments: document.getElementById("paymentsView"),
        feedback: document.getElementById("feedbackView"),
        users: document.getElementById("usersView")
    };

    const navs = {
        dashboard: document.getElementById("navDashboard"),
        parcels: document.getElementById("navParcels"),
        shipments: document.getElementById("navShipments"),
        tracking: document.getElementById("navTracking"),
        vehicles: document.getElementById("navVehicles"),
        customers: document.getElementById("navCustomers"),
        branches: document.getElementById("navBranches"),
        employees: document.getElementById("navEmployees"),
        payments: document.getElementById("navPayments"),
        feedback: document.getElementById("navFeedback"),
        users: document.getElementById("navUsers")
    };

    const topbarTitle = document.getElementById("topbarTitle");
    const topbarSubtitle = document.getElementById("topbarSubtitle");

    // Role-based view guards
    const user = window.currentUser;
    if (user) {
        if (["customers", "branches", "employees", "vehicles", "users"].includes(viewName)) {
            if (user.role !== "Administrator") {
                showToast("Access Restricted", "Administrator privileges required to access this view.");
                switchToView(user.role === "Courier Partner" ? "shipments" : "dashboard");
                return;
            }
        } else if (viewName === "shipments" && (user.role === "Customer" || user.role === "Seller/Vendor")) {
            showToast("Access Restricted", "Customer accounts cannot access fleet shipment records.");
            switchToView("dashboard");
            return;
        } else if (viewName === "payments" && user.role === "Courier Partner") {
            showToast("Access Restricted", "Courier accounts cannot access billing records.");
            switchToView("shipments");
            return;
        }
    }

    // Hide all views
    Object.values(views).forEach(v => {
        if (v) v.style.display = "none";
    });

    // Remove active state from all nav items
    Object.values(navs).forEach(n => {
        if (n) n.classList.remove("active");
    });

    if (viewName === "shipments") {
        if (views.shipments) views.shipments.style.display = "block";
        if (navs.shipments) navs.shipments.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = user && user.role === "Courier Partner" ? "My Assigned Shipments" : "Shipments";
        if (topbarSubtitle) topbarSubtitle.textContent = user && user.role === "Courier Partner" ? "Monitor assigned delivery routes, shipment checkpoints, and delivery status." : "Manage shipments, routes, delivery progress, and operational status.";
        loadShipmentStats();
        loadShipmentsTable();
    } else if (viewName === "vehicles") {
        if (views.vehicles) views.vehicles.style.display = "block";
        if (navs.vehicles) navs.vehicles.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Fleet Vehicles";
        if (topbarSubtitle) topbarSubtitle.textContent = "Monitor delivery vehicles, fleet capacity, and branch assignments.";
        loadVehicleStats();
        loadVehiclesTable();
    } else if (viewName === "customers") {
        if (views.customers) views.customers.style.display = "block";
        if (navs.customers) navs.customers.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Customers";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage customer profiles, contact information, and shipment activity.";
        loadCustomerStats();
        loadCustomersTable();
    } else if (viewName === "branches") {
        if (views.branches) views.branches.style.display = "block";
        if (navs.branches) navs.branches.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Branch Management";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage courier branches, locations, and operational status.";
        loadBranchStats();
        loadBranchesTable();
    } else if (viewName === "employees") {
        if (views.employees) views.employees.style.display = "block";
        if (navs.employees) navs.employees.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Employees";
        if (topbarSubtitle) topbarSubtitle.textContent = "Staff directory, designations, and branch assignment records.";
        loadEmployeeStats();
        loadEmployeesTable();
        loadBranchesForEmployeeFilter();
    } else if (viewName === "payments") {
        if (views.payments) views.payments.style.display = "block";
        if (navs.payments) navs.payments.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = user && (user.role === "Customer" || user.role === "Seller/Vendor") ? "My Invoices & Payments" : "Payments";
        if (topbarSubtitle) topbarSubtitle.textContent = "Parcel revenue collection, invoice history, and QR-based digital verification.";
        loadPaymentStats();
        loadPaymentsTable();
    } else if (viewName === "feedback") {
        if (views.feedback) views.feedback.style.display = "block";
        if (navs.feedback) navs.feedback.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Customer Feedback";
        if (topbarSubtitle) topbarSubtitle.textContent = "Service ratings, customer satisfaction reviews, and shipment delivery remarks.";
        loadFeedbackStats();
        loadFeedbackTable();
    } else if (viewName === "users") {
        if (views.users) views.users.style.display = "block";
        if (navs.users) navs.users.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "User Accounts & Approvals";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage system accounts, review pending courier and vendor applications, and audit security roles.";
        loadUsersTable();
    } else if (viewName === "parcels") {
        if (views.parcels) views.parcels.style.display = "block";
        if (navs.parcels) navs.parcels.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = user && (user.role === "Customer" || user.role === "Seller/Vendor") ? "My Parcels" : "Parcels";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage and track all shipments";
        loadParcels();
    } else {
        if (views.dashboard) views.dashboard.style.display = "block";
        if (navs.dashboard) navs.dashboard.classList.add("active");
        if (topbarTitle) topbarTitle.textContent = "Dashboard";
        if (topbarSubtitle) topbarSubtitle.textContent = "Courier & Parcel Tracking Management";
        loadDashboard();
    }
}


// =========================================================
// PARCELS MANAGEMENT
// =========================================================

let searchDebounceTimer = null;

function setupParcelsView() {
    const searchInput = document.getElementById("parcelsSearchInput");
    const statusFilter = document.getElementById("parcelsStatusFilter");
    const clearButton = document.getElementById("clearParcelsSearch");
    const refreshButton = document.getElementById("refreshParcelsButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                loadParcels();
            }, 300);
        });

        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                clearTimeout(searchDebounceTimer);
                loadParcels();
            }
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            loadParcels();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
            loadParcels();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadParcels();
        });
    }
}


async function loadParcels() {
    const tableBody = document.getElementById("parcelsTableBody");
    const countDisplay = document.getElementById("parcelsCountDisplay");
    const searchInput = document.getElementById("parcelsSearchInput");
    const statusFilter = document.getElementById("parcelsStatusFilter");

    const query = searchInput ? searchInput.value.trim() : "";
    const status = statusFilter ? statusFilter.value : "";

    const params = new URLSearchParams();
    if (query) {
        params.append("search", query);
    }
    if (status) {
        params.append("status", status);
    }

    const queryString = params.toString() ? `?${params.toString()}` : "";

    try {
        const response = await fetch(`/api/parcels${queryString}`);

        if (!response.ok) {
            throw new Error("Failed to load parcels");
        }

        const parcels = await response.json();
        renderParcelsTable(parcels);

        if (countDisplay) {
            countDisplay.textContent = `Showing ${parcels.length} parcel${parcels.length === 1 ? "" : "s"}`;
        }
    } catch (error) {
        console.error("Parcels loading error:", error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="empty-state" style="color: #ef4444;">
                        Failed to load parcel records from database.
                    </td>
                </tr>
            `;
        }
        if (countDisplay) {
            countDisplay.textContent = "Error loading parcels";
        }
    }
}


function renderParcelsTable(parcels) {
    const tableBody = document.getElementById("parcelsTableBody");

    if (!tableBody) {
        return;
    }

    tableBody.innerHTML = "";

    if (!parcels || parcels.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    No parcels found matching your criteria.
                </td>
            </tr>
        `;
        return;
    }

    parcels.forEach(parcel => {
        const row = document.createElement("tr");
        row.className = "table-row-clickable";

        const originCity = parcel.origin_city ? ` (${escapeHtml(parcel.origin_city)})` : "";
        const destCity = parcel.destination_city ? ` (${escapeHtml(parcel.destination_city)})` : "";

        const senderContact = parcel.sender_phone ? escapeHtml(parcel.sender_phone) : "";
        const receiverContact = parcel.receiver_phone ? escapeHtml(parcel.receiver_phone) : "";

        row.innerHTML = `
            <td>
                <strong style="color: #60a5fa; font-family: monospace; font-size: 14px;">
                    ${escapeHtml(parcel.tracking_number)}
                </strong>
            </td>
            <td>
                <div><strong>${escapeHtml(parcel.sender_name)}</strong></div>
                ${senderContact ? `<span class="cell-subtext">${senderContact}</span>` : ""}
            </td>
            <td>
                <div><strong>${escapeHtml(parcel.receiver_name)}</strong></div>
                ${receiverContact ? `<span class="cell-subtext">${receiverContact}</span>` : ""}
            </td>
            <td>
                <div class="route-cell">
                    <span>${escapeHtml(parcel.origin_branch)}${originCity}</span>
                    <i class="fa-solid fa-arrow-right route-cell-arrow"></i>
                    <span>${escapeHtml(parcel.destination_branch)}${destCity}</span>
                </div>
            </td>
            <td>
                <div>${escapeHtml(parcel.parcel_type)}</div>
                <span class="cell-subtext">${Number(parcel.weight).toFixed(2)} kg</span>
            </td>
            <td>
                <strong style="color: #f8fafc;">₹${Number(parcel.shipping_cost).toFixed(2)}</strong>
            </td>
            <td>
                ${createStatusBadge(parcel.status)}
            </td>
            <td style="color: #94a3b8; font-size: 12px; white-space: nowrap;">
                ${escapeHtml(parcel.booking_date)}
            </td>
            <td style="text-align: right;">
                <button
                    class="action-btn-view"
                    data-tracking="${escapeHtml(parcel.tracking_number)}"
                    title="View details"
                >
                    <i class="fa-solid fa-eye"></i>
                    View
                </button>
            </td>
        `;

        row.addEventListener("click", () => {
            fetchAndShowParcelDetails(parcel.tracking_number);
        });

        tableBody.appendChild(row);
    });
}


async function fetchAndShowParcelDetails(trackingNumber) {
    if (!trackingNumber) {
        return;
    }

    try {
        const response = await fetch(`/api/parcels/${encodeURIComponent(trackingNumber)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Parcel details not found");
        }

        showTrackingDetails(data);
    } catch (error) {
        console.error("Fetch parcel error:", error);
        showToast("Error", error.message || "Could not retrieve parcel details");
    }
}


// =========================================================
// BRANCHES MANAGEMENT
// =========================================================

let branchSearchDebounceTimer = null;
let pendingBranchConfirmAction = null;

function setupBranchesView() {
    const searchInput = document.getElementById("branchesSearchInput");
    const statusFilter = document.getElementById("branchesStatusFilter");
    const clearButton = document.getElementById("clearBranchesSearch");
    const refreshButton = document.getElementById("refreshBranchesButton");
    const newButton = document.getElementById("branchesNewButton");

    // Modal elements
    const branchModal = document.getElementById("branchModal");
    const closeBranchModalBtn = document.getElementById("closeBranchModal");
    const cancelBranchModalBtn = document.getElementById("cancelBranchModal");
    const branchForm = document.getElementById("branchForm");

    const branchDetailsModal = document.getElementById("branchDetailsModal");
    const closeBranchDetailsBtn = document.getElementById("closeBranchDetailsModal");
    const closeBranchDetailsActionBtn = document.getElementById("closeBranchDetailsButton");
    const editFromDetailsBtn = document.getElementById("editBranchFromDetailsButton");

    const branchConfirmModal = document.getElementById("branchConfirmModal");
    const closeConfirmModalBtn = document.getElementById("closeBranchConfirmModal");
    const cancelConfirmModalBtn = document.getElementById("cancelConfirmModal");
    const executeConfirmBtn = document.getElementById("executeConfirmModal");

    // Search input
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(branchSearchDebounceTimer);
            branchSearchDebounceTimer = setTimeout(() => {
                loadBranchesTable();
            }, 300);
        });

        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                clearTimeout(branchSearchDebounceTimer);
                loadBranchesTable();
            }
        });
    }

    // Status filter
    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            loadBranchesTable();
        });
    }

    // Clear search
    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
            loadBranchesTable();
        });
    }

    // Refresh button
    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadBranchStats();
            loadBranchesTable();
            showToast("Refreshed", "Branch network data refreshed.");
        });
    }

    // New Branch button
    if (newButton) {
        newButton.addEventListener("click", () => {
            openBranchModal();
        });
    }

    // Close Branch Form Modal
    if (closeBranchModalBtn) {
        closeBranchModalBtn.addEventListener("click", closeBranchModal);
    }
    if (cancelBranchModalBtn) {
        cancelBranchModalBtn.addEventListener("click", closeBranchModal);
    }
    if (branchModal) {
        branchModal.addEventListener("click", event => {
            if (event.target === branchModal) {
                closeBranchModal();
            }
        });
    }

    // Submit Branch Form
    if (branchForm) {
        branchForm.addEventListener("submit", saveBranch);
    }

    // Close Details Modal
    if (closeBranchDetailsBtn) {
        closeBranchDetailsBtn.addEventListener("click", closeBranchDetailsModal);
    }
    if (closeBranchDetailsActionBtn) {
        closeBranchDetailsActionBtn.addEventListener("click", closeBranchDetailsModal);
    }
    if (branchDetailsModal) {
        branchDetailsModal.addEventListener("click", event => {
            if (event.target === branchDetailsModal) {
                closeBranchDetailsModal();
            }
        });
    }
    if (editFromDetailsBtn) {
        editFromDetailsBtn.addEventListener("click", () => {
            const branchId = editFromDetailsBtn.dataset.branchId;
            closeBranchDetailsModal();
            if (branchId) {
                fetchBranchAndEdit(branchId);
            }
        });
    }

    // Confirm Modal
    if (closeConfirmModalBtn) {
        closeConfirmModalBtn.addEventListener("click", closeBranchConfirmModal);
    }
    if (cancelConfirmModalBtn) {
        cancelConfirmModalBtn.addEventListener("click", closeBranchConfirmModal);
    }
    if (branchConfirmModal) {
        branchConfirmModal.addEventListener("click", event => {
            if (event.target === branchConfirmModal) {
                closeBranchConfirmModal();
            }
        });
    }
    if (executeConfirmBtn) {
        executeConfirmBtn.addEventListener("click", () => {
            if (typeof pendingBranchConfirmAction === "function") {
                const action = pendingBranchConfirmAction;
                pendingBranchConfirmAction = null;
                action();
            }
        });
    }
}


async function loadBranchStats() {
    try {
        const response = await fetch("/api/branches/stats");
        if (!response.ok) {
            throw new Error("Failed to load branch statistics");
        }
        const stats = await response.json();

        const totalEl = document.getElementById("totalBranchesCount");
        const activeEl = document.getElementById("activeBranchesCount");
        const inactiveEl = document.getElementById("inactiveBranchesCount");
        const citiesEl = document.getElementById("citiesCoveredCount");

        if (totalEl) totalEl.textContent = stats.total_branches ?? 0;
        if (activeEl) activeEl.textContent = stats.active_branches ?? 0;
        if (inactiveEl) inactiveEl.textContent = stats.inactive_branches ?? 0;
        if (citiesEl) citiesEl.textContent = stats.cities_covered ?? 0;
    } catch (error) {
        console.error("Load branch stats error:", error);
    }
}


async function loadBranchesTable() {
    const tableBody = document.getElementById("branchesTableBody");
    const countDisplay = document.getElementById("branchesCountDisplay");
    const searchInput = document.getElementById("branchesSearchInput");
    const statusFilter = document.getElementById("branchesStatusFilter");

    const query = searchInput ? searchInput.value.trim() : "";
    const status = statusFilter ? statusFilter.value.trim() : "";

    if (countDisplay) {
        countDisplay.textContent = "Loading branches...";
    }

    try {
        const params = new URLSearchParams();
        if (query) params.append("search", query);
        if (status) params.append("status", status);

        const url = `/api/branches${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load branches");
        }

        const branches = await response.json();
        renderBranchesTable(branches);

        if (countDisplay) {
            countDisplay.textContent = `Showing ${branches.length} branch${branches.length === 1 ? "" : "es"}`;
        }
    } catch (error) {
        console.error("Load branches table error:", error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state" style="color: #f87171;">
                        Could not load branches. Please try refreshing.
                    </td>
                </tr>
            `;
        }
        if (countDisplay) {
            countDisplay.textContent = "Error loading branches";
        }
    }
}


function renderBranchesTable(branches) {
    const tableBody = document.getElementById("branchesTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!branches || branches.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No branches found matching criteria.
                </td>
            </tr>
        `;
        return;
    }

    branches.forEach(branch => {
        const row = document.createElement("tr");
        row.className = "table-row-clickable";

        const statusClass = branch.status === "Active" ? "status-active" : "status-inactive";
        const isInactive = branch.status === "Inactive";

        row.innerHTML = `
            <td>
                <strong style="color: #f8fafc; font-family: monospace;">#${branch.branch_id}</strong>
            </td>
            <td>
                <strong style="color: #f8fafc;">${escapeHtml(branch.branch_name)}</strong>
                <span class="cell-subtext">${escapeHtml(branch.address || "")}</span>
            </td>
            <td>${escapeHtml(branch.city)}</td>
            <td>${escapeHtml(branch.state)}</td>
            <td>${escapeHtml(branch.phone)}</td>
            <td>
                <span>${escapeHtml(branch.manager_name || "—")}</span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${escapeHtml(branch.status)}
                </span>
            </td>
            <td style="text-align: right;">
                <div class="branch-actions-wrap" onclick="event.stopPropagation()">
                    <button
                        class="action-btn-view"
                        data-branch-id="${branch.branch_id}"
                        title="View branch details"
                    >
                        <i class="fa-solid fa-eye"></i>
                        View
                    </button>
                    <button
                        class="action-btn-edit"
                        data-branch-id="${branch.branch_id}"
                        title="Edit branch"
                    >
                        <i class="fa-solid fa-pen-to-square"></i>
                        Edit
                    </button>
                    ${isInactive ? `
                        <button
                            class="action-btn-activate"
                            data-branch-id="${branch.branch_id}"
                            title="Activate branch"
                        >
                            <i class="fa-solid fa-circle-check"></i>
                            Activate
                        </button>
                    ` : `
                        <button
                            class="action-btn-deactivate"
                            data-branch-id="${branch.branch_id}"
                            title="Deactivate branch"
                        >
                            <i class="fa-solid fa-power-off"></i>
                            Deactivate
                        </button>
                    `}
                    <button
                        class="action-btn-delete"
                        data-branch-id="${branch.branch_id}"
                        data-branch-name="${escapeHtml(branch.branch_name)}"
                        title="Delete branch"
                    >
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </td>
        `;

        // Row click opens details
        row.addEventListener("click", () => {
            viewBranchDetails(branch.branch_id);
        });

        // Action button event handlers
        const viewBtn = row.querySelector(".action-btn-view");
        if (viewBtn) {
            viewBtn.addEventListener("click", e => {
                e.stopPropagation();
                viewBranchDetails(branch.branch_id);
            });
        }

        const editBtn = row.querySelector(".action-btn-edit");
        if (editBtn) {
            editBtn.addEventListener("click", e => {
                e.stopPropagation();
                fetchBranchAndEdit(branch.branch_id);
            });
        }

        const deactivateBtn = row.querySelector(".action-btn-deactivate");
        if (deactivateBtn) {
            deactivateBtn.addEventListener("click", e => {
                e.stopPropagation();
                toggleBranchStatus(branch.branch_id, "Inactive");
            });
        }

        const activateBtn = row.querySelector(".action-btn-activate");
        if (activateBtn) {
            activateBtn.addEventListener("click", e => {
                e.stopPropagation();
                toggleBranchStatus(branch.branch_id, "Active");
            });
        }

        const deleteBtn = row.querySelector(".action-btn-delete");
        if (deleteBtn) {
            deleteBtn.addEventListener("click", e => {
                e.stopPropagation();
                handleDeleteBranchClick(branch.branch_id, branch.branch_name);
            });
        }

        tableBody.appendChild(row);
    });
}


async function viewBranchDetails(branchId) {
    if (!branchId) return;

    try {
        const response = await fetch(`/api/branches/${branchId}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Branch not found");
        }

        const branch = await response.json();

        const nameEl = document.getElementById("detailBranchName");
        const metaEl = document.getElementById("detailBranchMeta");
        const statusEl = document.getElementById("detailBranchStatus");
        const phoneEl = document.getElementById("detailBranchPhone");
        const locationEl = document.getElementById("detailBranchLocation");
        const addressEl = document.getElementById("detailBranchAddress");
        const managerEl = document.getElementById("detailBranchManager");
        const managerEmailEl = document.getElementById("detailBranchManagerEmail");
        const outgoingEl = document.getElementById("detailBranchOutgoing");
        const incomingEl = document.getElementById("detailBranchIncoming");
        const editBtn = document.getElementById("editBranchFromDetailsButton");
        const parcelsTableBody = document.getElementById("detailBranchParcelsTable");

        if (nameEl) nameEl.textContent = branch.branch_name || "—";
        if (metaEl) metaEl.textContent = `Branch ID: #${branch.branch_id}`;

        if (statusEl) {
            const badgeClass = branch.status === "Active" ? "status-active" : "status-inactive";
            statusEl.innerHTML = `<span class="status-badge ${badgeClass}">${escapeHtml(branch.status)}</span>`;
        }

        if (phoneEl) phoneEl.textContent = branch.phone || "—";
        if (locationEl) locationEl.textContent = `${branch.city || ""}, ${branch.state || ""}`;
        if (addressEl) addressEl.textContent = branch.address || "—";
        if (managerEl) managerEl.textContent = branch.manager_name || "No Manager Assigned";
        if (managerEmailEl) managerEmailEl.textContent = branch.manager_email ? `${branch.manager_email} · ${branch.manager_phone || ""}` : (branch.manager_role || "");
        if (outgoingEl) outgoingEl.textContent = branch.outgoing_parcels ?? 0;
        if (incomingEl) incomingEl.textContent = branch.incoming_parcels ?? 0;

        if (editBtn) {
            editBtn.dataset.branchId = branch.branch_id;
        }

        if (parcelsTableBody) {
            parcelsTableBody.innerHTML = "";
            const recent = branch.recent_parcels || [];
            if (recent.length === 0) {
                parcelsTableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No linked parcel records yet</td></tr>`;
            } else {
                recent.forEach(p => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td><strong>${escapeHtml(p.tracking_number)}</strong></td>
                        <td><span class="tag-pill ${p.direction === 'Outgoing' ? 'outgoing' : 'incoming'}">${p.direction}</span></td>
                        <td>${createStatusBadge(p.status)}</td>
                        <td>${escapeHtml(p.parcel_type)} (${Number(p.weight).toFixed(1)} kg)</td>
                        <td>${escapeHtml(p.booking_date || "")}</td>
                    `;
                    parcelsTableBody.appendChild(tr);
                });
            }
        }

        const modal = document.getElementById("branchDetailsModal");
        if (modal) {
            modal.classList.add("show");
            modal.setAttribute("aria-hidden", "false");
        }
    } catch (error) {
        console.error("View branch error:", error);
        showToast("Error", error.message || "Could not load branch details");
    }
}


function closeBranchDetailsModal() {
    const modal = document.getElementById("branchDetailsModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


async function fetchBranchAndEdit(branchId) {
    try {
        const response = await fetch(`/api/branches/${branchId}`);
        if (!response.ok) {
            throw new Error("Could not retrieve branch details for editing");
        }
        const branch = await response.json();
        openBranchModal(branch);
    } catch (error) {
        console.error("Fetch branch for edit error:", error);
        showToast("Error", error.message || "Could not load branch data");
    }
}


function openBranchModal(branchData = null) {
    const modal = document.getElementById("branchModal");
    const title = document.getElementById("branchModalTitle");
    const subtitle = document.getElementById("branchModalSubtitle");
    const formId = document.getElementById("branchFormId");
    const nameInput = document.getElementById("branchNameInput");
    const addressInput = document.getElementById("branchAddressInput");
    const cityInput = document.getElementById("branchCityInput");
    const stateInput = document.getElementById("branchStateInput");
    const phoneInput = document.getElementById("branchPhoneInput");
    const statusInput = document.getElementById("branchStatusInput");
    const buttonText = document.getElementById("saveBranchButtonText");
    const messageEl = document.getElementById("branchFormMessage");

    if (!modal) return;

    if (messageEl) {
        messageEl.style.display = "none";
        messageEl.textContent = "";
    }

    if (branchData) {
        // Edit mode
        if (title) title.textContent = "Edit Branch";
        if (subtitle) subtitle.textContent = `Update information for ${branchData.branch_name} (#${branchData.branch_id}).`;
        if (formId) formId.value = branchData.branch_id;
        if (nameInput) nameInput.value = branchData.branch_name || "";
        if (addressInput) addressInput.value = branchData.address || "";
        if (cityInput) cityInput.value = branchData.city || "";
        if (stateInput) stateInput.value = branchData.state || "";
        if (phoneInput) phoneInput.value = branchData.phone || "";
        if (statusInput) statusInput.value = branchData.status || "Active";
        if (buttonText) buttonText.textContent = "Update Branch";
    } else {
        // Create mode
        if (title) title.textContent = "Create New Branch";
        if (subtitle) subtitle.textContent = "Enter courier branch location and contact details.";
        if (formId) formId.value = "";
        if (nameInput) nameInput.value = "";
        if (addressInput) addressInput.value = "";
        if (cityInput) cityInput.value = "";
        if (stateInput) stateInput.value = "";
        if (phoneInput) phoneInput.value = "";
        if (statusInput) statusInput.value = "Active";
        if (buttonText) buttonText.textContent = "Save Branch";
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}


function closeBranchModal() {
    const modal = document.getElementById("branchModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


async function saveBranch(event) {
    event.preventDefault();

    const formId = document.getElementById("branchFormId");
    const nameInput = document.getElementById("branchNameInput");
    const addressInput = document.getElementById("branchAddressInput");
    const cityInput = document.getElementById("branchCityInput");
    const stateInput = document.getElementById("branchStateInput");
    const phoneInput = document.getElementById("branchPhoneInput");
    const statusInput = document.getElementById("branchStatusInput");
    const submitBtn = document.getElementById("saveBranchButton");
    const messageEl = document.getElementById("branchFormMessage");

    const branchId = formId ? formId.value.trim() : "";
    const isEdit = Boolean(branchId);

    const payload = {
        branch_name: nameInput ? nameInput.value.trim() : "",
        address: addressInput ? addressInput.value.trim() : "",
        city: cityInput ? cityInput.value.trim() : "",
        state: stateInput ? stateInput.value.trim() : "",
        phone: phoneInput ? phoneInput.value.trim() : "",
        status: statusInput ? statusInput.value : "Active"
    };

    if (!payload.branch_name || !payload.address || !payload.city || !payload.state || !payload.phone) {
        if (messageEl) {
            messageEl.textContent = "Please fill in all required fields.";
            messageEl.style.display = "block";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        const url = isEdit ? `/api/branches/${branchId}` : "/api/branches";
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to save branch");
        }

        closeBranchModal();
        showToast("Success", isEdit ? "Branch updated successfully" : "New branch created successfully");

        // Refresh branch management and parcel dropdowns
        loadBranchStats();
        loadBranchesTable();
        loadBranches();
    } catch (error) {
        console.error("Save branch error:", error);
        if (messageEl) {
            messageEl.textContent = error.message || "An error occurred while saving the branch.";
            messageEl.style.display = "block";
        } else {
            showToast("Error", error.message || "Could not save branch");
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}


async function toggleBranchStatus(branchId, newStatus) {
    try {
        const response = await fetch(`/api/branches/${branchId}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Could not change status to ${newStatus}`);
        }

        showToast("Updated", `Branch marked as ${newStatus}`);
        loadBranchStats();
        loadBranchesTable();
        loadBranches();
    } catch (error) {
        console.error("Toggle branch status error:", error);
        showToast("Error", error.message || "Could not update status");
    }
}


async function handleDeleteBranchClick(branchId, branchName) {
    try {
        const response = await fetch(`/api/branches/${branchId}`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (response.status === 409) {
            // Branch is linked to existing records: prompt safe deactivation
            openBranchConfirmModal({
                title: "Deactivate Branch",
                eyebrow: "SAFETY WARNING",
                iconClass: "warning",
                message: `"${escapeHtml(branchName)}" is linked to existing parcels or operational records and cannot be safely deleted. Deactivate it instead?`,
                buttonText: "Deactivate Branch",
                action: async () => {
                    await executeSafeDeactivation(branchId);
                }
            });
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || "Could not delete branch");
        }

        showToast("Deleted", "Branch deleted successfully.");
        loadBranchStats();
        loadBranchesTable();
        loadBranches();
    } catch (error) {
        console.error("Delete branch error:", error);
        showToast("Error", error.message || "Delete operation failed");
    }
}


async function executeSafeDeactivation(branchId) {
    try {
        const response = await fetch(`/api/branches/${branchId}?deactivate=true`, {
            method: "DELETE"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Deactivation failed");
        }

        closeBranchConfirmModal();
        showToast("Deactivated", "Branch deactivated safely. Existing parcels remain intact.");
        loadBranchStats();
        loadBranchesTable();
        loadBranches();
    } catch (error) {
        console.error("Execute deactivation error:", error);
        showToast("Error", error.message || "Deactivation failed");
    }
}


function openBranchConfirmModal({ title, eyebrow, iconClass, message, buttonText, action }) {
    const modal = document.getElementById("branchConfirmModal");
    const titleEl = document.getElementById("confirmModalTitle");
    const eyebrowEl = document.getElementById("confirmModalEyebrow");
    const iconEl = document.getElementById("confirmModalIcon");
    const msgEl = document.getElementById("confirmModalMessage");
    const btnTextEl = document.getElementById("confirmButtonText");

    if (titleEl) titleEl.textContent = title;
    if (eyebrowEl) eyebrowEl.textContent = eyebrow || "SAFETY CONFIRMATION";
    if (iconEl) {
        iconEl.className = `confirm-icon-wrap ${iconClass || 'warning'}`;
    }
    if (msgEl) msgEl.textContent = message;
    if (btnTextEl) btnTextEl.textContent = buttonText;

    pendingBranchConfirmAction = action;

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}


function closeBranchConfirmModal() {
    const modal = document.getElementById("branchConfirmModal");
    pendingBranchConfirmAction = null;
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


// =========================================================
// SHIPMENTS MANAGEMENT
// =========================================================

let shipmentSearchDebounceTimer = null;
let currentShipmentActiveTrackingNumber = null;

function setupShipmentsView() {
    const searchInput = document.getElementById("shipmentsSearchInput");
    const statusFilter = document.getElementById("shipmentsStatusFilter");
    const clearButton = document.getElementById("clearShipmentsSearch");
    const refreshButton = document.getElementById("refreshShipmentsButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(shipmentSearchDebounceTimer);
            shipmentSearchDebounceTimer = setTimeout(() => {
                loadShipmentsTable();
            }, 300);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            loadShipmentsTable();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
            loadShipmentsTable();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadShipmentStats();
            loadShipmentsTable();
            showToast("Shipments Refreshed", "Live shipment data and KPIs updated from database.");
        });
    }

    // Modal listeners
    const modal = document.getElementById("shipmentDetailsModal");
    const closeBtn = document.getElementById("closeShipmentDetailsModal");
    const closeActionBtn = document.getElementById("closeShipmentDetailsButton");
    const liveTrackingBtn = document.getElementById("viewTrackingFromShipmentButton");

    if (closeBtn) closeBtn.addEventListener("click", closeShipmentDetailsModal);
    if (closeActionBtn) closeActionBtn.addEventListener("click", closeShipmentDetailsModal);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeShipmentDetailsModal();
            }
        });
    }

    if (liveTrackingBtn) {
        liveTrackingBtn.addEventListener("click", () => {
            if (currentShipmentActiveTrackingNumber) {
                closeShipmentDetailsModal();
                fetchAndShowParcelDetails(currentShipmentActiveTrackingNumber);
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal && modal.classList.contains("show")) {
            closeShipmentDetailsModal();
        }
    });
}


async function loadShipmentStats() {
    try {
        const response = await fetch("/api/shipments/stats");
        if (!response.ok) throw new Error("Failed to load shipment statistics");

        const stats = await response.json();

        const totalEl = document.getElementById("totalShipmentsCount");
        const pendingEl = document.getElementById("pendingShipmentsCount");
        const transitEl = document.getElementById("inTransitShipmentsCount");
        const outEl = document.getElementById("outForDeliveryShipmentsCount");
        const deliveredEl = document.getElementById("deliveredShipmentsCount");

        if (totalEl) totalEl.textContent = stats.total_shipments ?? 0;
        if (pendingEl) pendingEl.textContent = stats.pending ?? 0;
        if (transitEl) transitEl.textContent = stats.in_transit ?? 0;
        if (outEl) outEl.textContent = stats.out_for_delivery ?? 0;
        if (deliveredEl) deliveredEl.textContent = stats.delivered ?? 0;
    } catch (error) {
        console.error("Error loading shipment stats:", error);
    }
}


async function loadShipmentsTable() {
    const tableBody = document.getElementById("shipmentsTableBody");
    const countDisplay = document.getElementById("shipmentsCountDisplay");
    const searchInput = document.getElementById("shipmentsSearchInput");
    const statusFilter = document.getElementById("shipmentsStatusFilter");

    if (!tableBody) return;

    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const selectedStatus = statusFilter ? statusFilter.value.trim() : "";

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedStatus) params.append("status", selectedStatus);

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Loading shipment records from database...
            </td>
        </tr>
    `;

    try {
        const url = `/api/shipments${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load shipments");
        }

        const shipments = await response.json();

        if (countDisplay) {
            if (shipments.length === 0) {
                countDisplay.textContent = "0 shipments found";
            } else if (shipments.length === 1) {
                countDisplay.textContent = "1 shipment found";
            } else {
                countDisplay.textContent = `${shipments.length} shipments found`;
            }
        }

        renderShipmentsTable(shipments);
    } catch (error) {
        console.error("Error loading shipments:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state error-message">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
                    Failed to load shipment records. Please try refreshing.
                </td>
            </tr>
        `;
        if (countDisplay) countDisplay.textContent = "Error loading shipments";
    }
}


function renderShipmentsTable(shipments) {
    const tableBody = document.getElementById("shipmentsTableBody");
    if (!tableBody) return;

    if (!shipments || shipments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div style="padding: 24px 0; text-align: center;">
                        <i class="fa-solid fa-truck-ramp-box" style="font-size: 32px; color: #475569; margin-bottom: 12px; display: block;"></i>
                        <strong style="color: #cbd5e1; font-size: 15px; display: block; margin-bottom: 4px;">No shipments found</strong>
                        <span style="color: #64748b; font-size: 13px;">No shipment records match your current filters or have been booked yet.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = shipments.map(shipment => {
        const statusBadge = createStatusBadge(shipment.status || "Pending");
        const originText = shipment.origin_city ? `${escapeHtml(shipment.origin_branch || "")} (${escapeHtml(shipment.origin_city)})` : escapeHtml(shipment.origin_branch || "N/A");
        const destText = shipment.destination_city ? `${escapeHtml(shipment.destination_branch || "")} (${escapeHtml(shipment.destination_city)})` : escapeHtml(shipment.destination_branch || "N/A");
        const currentLocation = shipment.current_location ? escapeHtml(shipment.current_location) : "In Transit";

        return `
            <tr class="clickable-row" data-shipment-id="${shipment.shipment_id}">
                <td>
                    <span class="tracking-pill">
                        #SHP-${shipment.shipment_id}
                    </span>
                </td>
                <td>
                    <strong style="color: #f1f5f9; font-family: monospace; font-size: 13px;">
                        ${escapeHtml(shipment.tracking_number || "N/A")}
                    </strong>
                </td>
                <td>
                    <div class="customer-cell">
                        <strong>${escapeHtml(shipment.sender_name || "Unknown")}</strong>
                        <span class="cell-subtext">${escapeHtml(shipment.sender_phone || "")}</span>
                    </div>
                </td>
                <td>
                    <div class="customer-cell">
                        <strong>${escapeHtml(shipment.receiver_name || "Unknown")}</strong>
                        <span class="cell-subtext">${escapeHtml(shipment.receiver_phone || "")}</span>
                    </div>
                </td>
                <td>
                    <div class="shipment-route-cell">
                        <div class="shipment-route-cities">
                            <span class="route-city-tag origin-city">${escapeHtml(shipment.origin_city || shipment.origin_branch || "Origin")}</span>
                            <i class="fa-solid fa-arrow-right-long shipment-route-arrow"></i>
                            <span class="route-city-tag dest-city">${escapeHtml(shipment.destination_city || shipment.destination_branch || "Destination")}</span>
                        </div>
                        <div class="shipment-route-hubs">
                            <span>${escapeHtml(shipment.origin_branch || "")}</span>
                            <span class="hub-divider">→</span>
                            <span>${escapeHtml(shipment.destination_branch || "")}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="display: flex; align-items: center; gap: 6px; color: #cbd5e1; font-size: 13px;">
                        <i class="fa-solid fa-location-dot" style="color: #38bdf8; font-size: 11px;"></i>
                        ${currentLocation}
                    </span>
                </td>
                <td>
                    <span class="date-cell">
                        ${escapeHtml(shipment.shipment_date || "N/A")}
                    </span>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td style="text-align: right;">
                    <button
                        class="secondary-button action-btn-view view-shipment-btn"
                        data-shipment-id="${shipment.shipment_id}"
                        title="View Complete Shipment & Route Details"
                    >
                        <i class="fa-solid fa-eye"></i>
                        <span>View</span>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    // Bind click events on rows and view buttons
    tableBody.querySelectorAll(".clickable-row").forEach(row => {
        row.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            const shipmentId = row.getAttribute("data-shipment-id");
            if (shipmentId) viewShipmentDetails(shipmentId);
        });
    });

    tableBody.querySelectorAll(".view-shipment-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const shipmentId = btn.getAttribute("data-shipment-id");
            if (shipmentId) viewShipmentDetails(shipmentId);
        });
    });
}


async function viewShipmentDetails(shipmentId) {
    const modal = document.getElementById("shipmentDetailsModal");
    if (!modal) return;

    try {
        const response = await fetch(`/api/shipments/${shipmentId}`);
        if (!response.ok) throw new Error("Could not fetch shipment details");

        const s = await response.json();
        currentShipmentActiveTrackingNumber = s.tracking_number;

        // Populate Header
        const titleEl = document.getElementById("detailShipmentTitle");
        const metaEl = document.getElementById("detailShipmentMeta");
        if (titleEl) titleEl.textContent = `Shipment #SHP-${s.shipment_id}`;
        if (metaEl) metaEl.textContent = `Tracking Number: ${s.tracking_number} • Booked: ${s.booking_date || s.shipment_date || "N/A"}`;

        // Populate Status & Location
        const statusEl = document.getElementById("detailShipmentStatus");
        if (statusEl) {
            statusEl.innerHTML = createStatusBadge(s.status || "Pending");
        }

        const locEl = document.getElementById("detailShipmentLocation");
        if (locEl) {
            locEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-location-dot" style="color: #38bdf8;"></i>
                    <strong>${escapeHtml(s.current_location || s.origin_city || "In Transit")}</strong>
                </div>
            `;
        }

        // Route
        const routeEl = document.getElementById("detailShipmentRoute");
        if (routeEl) {
            routeEl.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span><strong>${escapeHtml(s.origin_branch || "Origin")}</strong> (${escapeHtml(s.origin_city || "")}, ${escapeHtml(s.origin_state || "")})</span>
                    <i class="fa-solid fa-arrow-right" style="color: #64748b;"></i>
                    <span><strong>${escapeHtml(s.destination_branch || "Destination")}</strong> (${escapeHtml(s.destination_city || "")}, ${escapeHtml(s.destination_state || "")})</span>
                </div>
            `;
        }

        // Date
        const dateEl = document.getElementById("detailShipmentDate");
        if (dateEl) {
            dateEl.textContent = s.shipment_date || "N/A";
        }

        // Sender
        const senderEl = document.getElementById("detailShipmentSender");
        const senderContactEl = document.getElementById("detailShipmentSenderContact");
        if (senderEl) senderEl.textContent = s.sender_name || "N/A";
        if (senderContactEl) {
            const parts = [];
            if (s.sender_phone) parts.push(s.sender_phone);
            if (s.sender_email) parts.push(s.sender_email);
            if (s.sender_address) parts.push(s.sender_address);
            senderContactEl.textContent = parts.join(" • ") || "No contact info";
        }

        // Receiver
        const receiverEl = document.getElementById("detailShipmentReceiver");
        const receiverContactEl = document.getElementById("detailShipmentReceiverContact");
        if (receiverEl) receiverEl.textContent = s.receiver_name || "N/A";
        if (receiverContactEl) {
            const parts = [];
            if (s.receiver_phone) parts.push(s.receiver_phone);
            if (s.receiver_email) parts.push(s.receiver_email);
            if (s.receiver_address) parts.push(s.receiver_address);
            receiverContactEl.textContent = parts.join(" • ") || "No contact info";
        }

        // Vehicle
        const vehicleEl = document.getElementById("detailShipmentVehicle");
        const vehicleTypeEl = document.getElementById("detailShipmentVehicleType");
        if (vehicleEl) {
            vehicleEl.textContent = s.vehicle_number ? `Vehicle: ${s.vehicle_number}` : "No vehicle assigned";
        }
        if (vehicleTypeEl) {
            const parts = [];
            if (s.vehicle_type) parts.push(`Type: ${s.vehicle_type}`);
            if (s.vehicle_capacity) parts.push(`Capacity: ${s.vehicle_capacity} kg`);
            vehicleTypeEl.textContent = parts.join(" • ") || "Standard Fleet";
        }

        // Employee
        const empEl = document.getElementById("detailShipmentEmployee");
        const empRoleEl = document.getElementById("detailShipmentEmployeeRole");
        if (empEl) empEl.textContent = s.employee_name || "Operations Team";
        if (empRoleEl) {
            const parts = [];
            if (s.employee_role) parts.push(s.employee_role);
            if (s.employee_phone) parts.push(s.employee_phone);
            empRoleEl.textContent = parts.join(" • ") || "Assigned Officer";
        }

        // Package Specifications
        const pkgEl = document.getElementById("detailShipmentPackage");
        if (pkgEl) {
            pkgEl.innerHTML = `
                <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 13px;">
                    <span><strong>Type:</strong> ${escapeHtml(s.parcel_type || "Standard")}</span>
                    <span><strong>Weight:</strong> ${s.weight ?? "N/A"} kg</span>
                    <span><strong>Shipping Cost:</strong> ₹${s.shipping_cost ?? "0.00"}</span>
                    <span><strong>Parcel ID:</strong> #${s.parcel_id}</span>
                </div>
            `;
        }

        // Tracking Timeline
        const timelineEl = document.getElementById("detailShipmentTimeline");
        if (timelineEl) {
            const history = s.tracking_history || [];
            if (history.length === 0) {
                timelineEl.innerHTML = `
                    <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">
                        <i class="fa-solid fa-clock" style="margin-right: 6px;"></i>
                        No tracking checkpoint scans recorded for this parcel yet.
                    </div>
                `;
            } else {
                timelineEl.innerHTML = history.map((event, idx) => {
                    const isLatest = idx === history.length - 1;
                    const iconClass = isLatest ? "fa-solid fa-location-dot" : "fa-solid fa-check";
                    const iconBg = isLatest ? "background: rgba(56, 189, 248, 0.2); color: #38bdf8;" : "background: rgba(34, 197, 94, 0.2); color: #4ade80;";

                    return `
                        <div class="shipment-timeline-step">
                            <div class="shipment-timeline-icon" style="${iconBg}">
                                <i class="${iconClass}"></i>
                            </div>
                            <div class="shipment-timeline-content">
                                <div class="shipment-timeline-header">
                                    <span class="shipment-timeline-title">${escapeHtml(event.status || "Checkpoint")}</span>
                                    <span class="shipment-timeline-time">${escapeHtml(event.update_time || "")}</span>
                                </div>
                                <div class="shipment-timeline-location">
                                    <i class="fa-solid fa-building" style="font-size: 10px; color: #94a3b8;"></i>
                                    <span>${escapeHtml(event.location || event.branch_name || "Transit Scan")}</span>
                                </div>
                                ${event.employee_name ? `<div class="shipment-timeline-employee">Handled by: ${escapeHtml(event.employee_name)}</div>` : ""}
                            </div>
                        </div>
                    `;
                }).join("");
            }
        }

        // Open modal
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    } catch (error) {
        console.error("Error viewing shipment details:", error);
        showToast("Error", "Could not load shipment details from the server.");
    }
}


function closeShipmentDetailsModal() {
    const modal = document.getElementById("shipmentDetailsModal");
    currentShipmentActiveTrackingNumber = null;
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


// =========================================================
// VEHICLES MANAGEMENT
// =========================================================

let vehicleSearchDebounceTimer = null;

function setupVehiclesView() {
    const searchInput = document.getElementById("vehiclesSearchInput");
    const typeFilter = document.getElementById("vehiclesTypeFilter");
    const statusFilter = document.getElementById("vehiclesStatusFilter");
    const clearButton = document.getElementById("clearVehiclesSearch");
    const refreshButton = document.getElementById("refreshVehiclesButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(vehicleSearchDebounceTimer);
            vehicleSearchDebounceTimer = setTimeout(() => {
                loadVehiclesTable();
            }, 300);
        });
    }

    if (typeFilter) {
        typeFilter.addEventListener("change", () => {
            loadVehiclesTable();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            loadVehiclesTable();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (typeFilter) typeFilter.value = "";
            if (statusFilter) statusFilter.value = "";
            loadVehiclesTable();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadVehicleStats();
            loadVehiclesTable();
            showToast("Vehicles Refreshed", "Live fleet data and KPI metrics updated from database.");
        });
    }

    // Modal listeners
    const modal = document.getElementById("vehicleDetailsModal");
    const closeBtn = document.getElementById("closeVehicleDetailsModal");
    const closeActionBtn = document.getElementById("closeVehicleDetailsButton");

    if (closeBtn) closeBtn.addEventListener("click", closeVehicleDetailsModal);
    if (closeActionBtn) closeActionBtn.addEventListener("click", closeVehicleDetailsModal);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeVehicleDetailsModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal && modal.classList.contains("show")) {
            closeVehicleDetailsModal();
        }
    });
}


async function loadVehicleStats() {
    try {
        const response = await fetch("/api/vehicles/stats");
        if (!response.ok) throw new Error("Failed to load vehicle stats");

        const stats = await response.json();

        const totalEl = document.getElementById("totalVehiclesCount");
        const availEl = document.getElementById("availableVehiclesCount");
        const inServEl = document.getElementById("inServiceVehiclesCount");
        const capEl = document.getElementById("fleetCapacityCount");

        if (totalEl) totalEl.textContent = stats.total_vehicles ?? 0;
        if (availEl) availEl.textContent = stats.available ?? 0;
        if (inServEl) inServEl.textContent = stats.in_service ?? 0;
        if (capEl) {
            const capVal = Math.round(Number(stats.total_capacity) || 0);
            capEl.textContent = `${capVal.toLocaleString()} kg`;
        }
    } catch (error) {
        console.error("Error loading vehicle stats:", error);
    }
}


async function loadVehiclesTable() {
    const tableBody = document.getElementById("vehiclesTableBody");
    const countDisplay = document.getElementById("vehiclesCountDisplay");
    const searchInput = document.getElementById("vehiclesSearchInput");
    const typeFilter = document.getElementById("vehiclesTypeFilter");
    const statusFilter = document.getElementById("vehiclesStatusFilter");

    if (!tableBody) return;

    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const selectedType = typeFilter ? typeFilter.value.trim() : "";
    const selectedStatus = statusFilter ? statusFilter.value.trim() : "";

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedType) params.append("type", selectedType);
    if (selectedStatus) params.append("status", selectedStatus);

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Loading fleet records from database...
            </td>
        </tr>
    `;

    try {
        const url = `/api/vehicles${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load vehicles");
        }

        const vehicles = await response.json();

        if (countDisplay) {
            if (vehicles.length === 0) {
                countDisplay.textContent = "0 vehicles found";
            } else if (vehicles.length === 1) {
                countDisplay.textContent = "1 vehicle found";
            } else {
                countDisplay.textContent = `${vehicles.length} vehicles found`;
            }
        }

        renderVehiclesTable(vehicles);
    } catch (error) {
        console.error("Error loading vehicles:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state error-message">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
                    Failed to load vehicle records. Please try refreshing.
                </td>
            </tr>
        `;
        if (countDisplay) countDisplay.textContent = "Error loading vehicles";
    }
}


function renderVehiclesTable(vehicles) {
    const tableBody = document.getElementById("vehiclesTableBody");
    if (!tableBody) return;

    if (!vehicles || vehicles.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div style="padding: 24px 0; text-align: center;">
                        <i class="fa-solid fa-truck" style="font-size: 32px; color: #475569; margin-bottom: 12px; display: block;"></i>
                        <strong style="color: #cbd5e1; font-size: 15px; display: block; margin-bottom: 4px;">No vehicles found</strong>
                        <span style="color: #64748b; font-size: 13px;">No vehicle records match your filters or branch query.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = vehicles.map(vehicle => {
        const isInService = vehicle.status === "In Service";
        const statusBadge = isInService
            ? `<span class="status-badge in-transit"><span class="badge-dot"></span>In Service</span>`
            : `<span class="status-badge delivered"><span class="badge-dot"></span>Available</span>`;

        const activeCount = vehicle.active_shipments || 0;
        const activeCountBadge = `<span class="count-pill" style="padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: ${activeCount > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.15)'}; color: ${activeCount > 0 ? '#38bdf8' : '#94a3b8'}; border: 1px solid ${activeCount > 0 ? 'rgba(56, 189, 248, 0.3)' : 'rgba(100, 116, 139, 0.3)'};">${activeCount} ${activeCount === 1 ? 'shipment' : 'shipments'}</span>`;

        return `
            <tr class="clickable-row" data-vehicle-id="${vehicle.vehicle_id}">
                <td>
                    <span class="tracking-pill">
                        #VH-${vehicle.vehicle_id}
                    </span>
                </td>
                <td>
                    <strong style="color: #f1f5f9; font-family: monospace; font-size: 13px;">
                        ${escapeHtml(vehicle.vehicle_number)}
                    </strong>
                </td>
                <td>
                    <span>${escapeHtml(vehicle.vehicle_type || "N/A")}</span>
                </td>
                <td>
                    <strong>${vehicle.capacity ? `${vehicle.capacity} kg` : "N/A"}</strong>
                </td>
                <td>
                    <strong>${escapeHtml(vehicle.branch_name || "N/A")}</strong>
                </td>
                <td>
                    <span>${escapeHtml(vehicle.city || "")}, ${escapeHtml(vehicle.state || "")}</span>
                </td>
                <td>
                    ${statusBadge}
                </td>
                <td>
                    ${activeCountBadge}
                </td>
                <td style="text-align: right;">
                    <button
                        class="secondary-button action-btn-view view-vehicle-btn"
                        data-vehicle-id="${vehicle.vehicle_id}"
                        title="Inspect Fleet Specifications and History"
                    >
                        <i class="fa-solid fa-eye"></i>
                        <span>View</span>
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll(".clickable-row").forEach(row => {
        row.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            const vehicleId = row.getAttribute("data-vehicle-id");
            if (vehicleId) viewVehicleDetails(vehicleId);
        });
    });

    tableBody.querySelectorAll(".view-vehicle-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const vehicleId = btn.getAttribute("data-vehicle-id");
            if (vehicleId) viewVehicleDetails(vehicleId);
        });
    });
}


async function viewVehicleDetails(vehicleId) {
    const modal = document.getElementById("vehicleDetailsModal");
    if (!modal) return;

    try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) {
            throw new Error("Failed to load vehicle details");
        }

        const v = await response.json();

        const numEl = document.getElementById("detailVehicleNumber");
        const metaEl = document.getElementById("detailVehicleMeta");
        const statusEl = document.getElementById("detailVehicleStatus");
        const typeEl = document.getElementById("detailVehicleType");
        const capEl = document.getElementById("detailVehicleCapacity");
        const branchEl = document.getElementById("detailVehicleBranch");
        const locEl = document.getElementById("detailVehicleLocation");
        const shipmentsTable = document.getElementById("detailVehicleShipmentsTable");

        if (numEl) numEl.textContent = v.vehicle_number || "Vehicle";
        if (metaEl) metaEl.textContent = `Vehicle ID: #VH-${v.vehicle_id}`;

        if (statusEl) {
            const isInService = v.status === "In Service";
            statusEl.innerHTML = isInService
                ? `<span class="status-badge in-transit"><span class="badge-dot"></span>In Service</span>`
                : `<span class="status-badge delivered"><span class="badge-dot"></span>Available</span>`;
        }

        if (typeEl) typeEl.textContent = v.vehicle_type || "N/A";
        if (capEl) capEl.textContent = v.capacity ? `${v.capacity} kg` : "N/A";
        if (branchEl) branchEl.textContent = v.branch_name || "N/A";
        if (locEl) {
            const parts = [];
            if (v.city) parts.push(v.city);
            if (v.state) parts.push(v.state);
            if (v.branch_phone) parts.push(`Ph: ${v.branch_phone}`);
            locEl.textContent = parts.join(" • ") || "No location details";
        }

        if (shipmentsTable) {
            const shipments = v.recent_shipments || [];
            if (shipments.length === 0) {
                shipmentsTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">No assigned shipments found for this vehicle.</td>
                    </tr>
                `;
            } else {
                shipmentsTable.innerHTML = shipments.map(s => `
                    <tr>
                        <td>
                            <span class="tracking-pill">#SHP-${s.shipment_id}</span>
                        </td>
                        <td>
                            <strong style="color: #f1f5f9; font-family: monospace; font-size: 13px;">${escapeHtml(s.tracking_number)}</strong>
                        </td>
                        <td>
                            ${createStatusBadge(s.status || "Pending")}
                        </td>
                        <td>
                            ${escapeHtml(s.parcel_type || "Standard")} (${s.weight ?? "N/A"} kg)
                        </td>
                        <td>
                            ${escapeHtml(s.employee_name || "Assigned Officer")}
                        </td>
                        <td>
                            ${escapeHtml(s.shipment_date || "N/A")}
                        </td>
                    </tr>
                `).join("");
            }
        }

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    } catch (error) {
        console.error("Error viewing vehicle details:", error);
        showToast("Error", "Could not load vehicle details from the server.");
    }
}


function closeVehicleDetailsModal() {
    const modal = document.getElementById("vehicleDetailsModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


// =========================================================
// ASSIGN SHIPMENT MODAL
// =========================================================

function setupAssignShipmentModal() {
    const modal = document.getElementById("assignShipmentModal");
    const form = document.getElementById("assignShipmentForm");
    const closeBtn = document.getElementById("closeAssignShipmentModal");
    const cancelBtn = document.getElementById("cancelAssignShipmentModal");

    if (closeBtn) closeBtn.addEventListener("click", closeAssignShipmentModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeAssignShipmentModal);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeAssignShipmentModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal && modal.classList.contains("show")) {
            closeAssignShipmentModal();
        }
    });

    if (form) {
        form.addEventListener("submit", handleAssignShipmentSubmit);
    }
}


async function openAssignShipmentModal() {
    const modal = document.getElementById("assignShipmentModal");
    const form = document.getElementById("assignShipmentForm");
    const messageEl = document.getElementById("assignShipmentMessage");
    const parcelSelect = document.getElementById("assignParcelSelect");
    const vehicleSelect = document.getElementById("assignVehicleSelect");
    const employeeSelect = document.getElementById("assignEmployeeSelect");
    const parcelHint = document.getElementById("unassignedParcelHint");
    const submitBtn = document.getElementById("submitAssignShipmentButton");

    if (!modal) return;

    if (form) form.reset();
    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }
    if (parcelHint) parcelHint.textContent = "";

    if (parcelSelect) parcelSelect.innerHTML = `<option value="">Loading unassigned parcels...</option>`;
    if (vehicleSelect) vehicleSelect.innerHTML = `<option value="">Loading vehicles...</option>`;
    if (employeeSelect) employeeSelect.innerHTML = `<option value="">Loading employees...</option>`;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    try {
        const [parcelsRes, vehiclesRes, employeesRes] = await Promise.all([
            fetch("/api/shipments/unassigned-parcels"),
            fetch("/api/vehicles"),
            fetch("/api/employees")
        ]);

        const parcels = parcelsRes.ok ? await parcelsRes.json() : [];
        const vehicles = vehiclesRes.ok ? await vehiclesRes.json() : [];
        const employees = employeesRes.ok ? await employeesRes.json() : [];

        // 1. Populate Unassigned Parcels
        if (parcelSelect) {
            if (parcels.length === 0) {
                parcelSelect.innerHTML = `<option value="">No unassigned parcels available (all parcels dispatched)</option>`;
                if (parcelHint) {
                    parcelHint.textContent = "All currently booked parcels already have shipments assigned in MySQL.";
                }
                if (submitBtn) submitBtn.disabled = true;
            } else {
                if (submitBtn) submitBtn.disabled = false;
                parcelSelect.innerHTML = `
                    <option value="">-- Choose an unassigned parcel --</option>
                    ${parcels.map(p => `
                        <option value="${p.parcel_id}" data-origin="${escapeHtml(p.origin_branch)}" data-dest="${escapeHtml(p.destination_branch)}">
                            ${escapeHtml(p.tracking_number)} — ${escapeHtml(p.parcel_type)} (${p.weight} kg) | ${escapeHtml(p.origin_city)} → ${escapeHtml(p.destination_city)}
                        </option>
                    `).join("")}
                `;

                parcelSelect.onchange = () => {
                    const opt = parcelSelect.options[parcelSelect.selectedIndex];
                    if (opt && opt.value) {
                        const origin = opt.getAttribute("data-origin") || "";
                        const dest = opt.getAttribute("data-dest") || "";
                        if (parcelHint) {
                            parcelHint.textContent = `Route: ${origin} → ${dest}`;
                        }
                    } else if (parcelHint) {
                        parcelHint.textContent = "";
                    }
                };
            }
        }

        // 2. Populate Vehicles
        if (vehicleSelect) {
            vehicleSelect.innerHTML = `
                <option value="">-- Choose a delivery vehicle --</option>
                ${vehicles.map(v => `
                    <option value="${v.vehicle_id}">
                        ${escapeHtml(v.vehicle_number)} — ${escapeHtml(v.vehicle_type)} (${v.capacity} kg) [${escapeHtml(v.city)}] — ${v.status}
                    </option>
                `).join("")}
            `;
        }

        // 3. Populate Employees
        if (employeeSelect) {
            employeeSelect.innerHTML = `
                <option value="">-- Choose an operations officer --</option>
                ${employees.map(e => `
                    <option value="${e.employee_id}">
                        ${escapeHtml(e.name)} — ${escapeHtml(e.role || "Officer")} [${escapeHtml(e.branch_name || "")}, ${escapeHtml(e.city || "")}]
                    </option>
                `).join("")}
            `;
        }

    } catch (error) {
        console.error("Error loading dropdown data for assignment:", error);
        if (messageEl) {
            messageEl.textContent = "Failed to load options from the database. Please try again.";
            messageEl.className = "form-message error";
        }
    }
}


function closeAssignShipmentModal() {
    const modal = document.getElementById("assignShipmentModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


async function handleAssignShipmentSubmit(event) {
    event.preventDefault();

    const messageEl = document.getElementById("assignShipmentMessage");
    const parcelSelect = document.getElementById("assignParcelSelect");
    const vehicleSelect = document.getElementById("assignVehicleSelect");
    const employeeSelect = document.getElementById("assignEmployeeSelect");
    const submitBtn = document.getElementById("submitAssignShipmentButton");

    const parcelId = parcelSelect ? parcelSelect.value : "";
    const vehicleId = vehicleSelect ? vehicleSelect.value : "";
    const employeeId = employeeSelect ? employeeSelect.value : "";

    if (!parcelId || !vehicleId || !employeeId) {
        if (messageEl) {
            messageEl.textContent = "Please select a parcel, a vehicle, and an operations officer.";
            messageEl.className = "form-message error";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Assigning...</span>`;
    }

    try {
        const response = await fetch("/api/shipments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parcel_id: parseInt(parcelId, 10),
                vehicle_id: parseInt(vehicleId, 10),
                employee_id: parseInt(employeeId, 10)
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to create shipment dispatch");
        }

        closeAssignShipmentModal();
        showToast("Shipment Dispatched", `Shipment #SHP-${result.shipment_id} assigned to ${result.vehicle_number} (${result.employee_name}).`);

        // Refresh all relevant views
        loadShipmentStats();
        loadShipmentsTable();
        loadVehicleStats();
        loadVehiclesTable();
        loadDashboard();
        loadAlerts();
        loadParcels();

    } catch (error) {
        console.error("Error creating shipment:", error);
        if (messageEl) {
            messageEl.textContent = error.message || "An unexpected error occurred.";
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-truck-fast"></i><span>Assign &amp; Dispatch</span>`;
        }
    }
}


// =========================================================
// UPDATE TRACKING MODAL & TRANSIT EVENTS
// =========================================================

function setupUpdateTrackingModal() {
    const modal = document.getElementById("updateTrackingModal");
    const form = document.getElementById("updateTrackingForm");
    const closeBtn = document.getElementById("closeUpdateTrackingModal");
    const cancelBtn = document.getElementById("cancelUpdateTrackingModal");

    if (closeBtn) closeBtn.addEventListener("click", closeUpdateTrackingModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeUpdateTrackingModal);

    if (modal) {
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                closeUpdateTrackingModal();
            }
        });
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal && modal.classList.contains("show")) {
            closeUpdateTrackingModal();
        }
    });

    if (form) {
        form.addEventListener("submit", handleUpdateTrackingSubmit);
    }
}

async function openUpdateTrackingModal(preselectParcelId = null) {
    const modal = document.getElementById("updateTrackingModal");
    const form = document.getElementById("updateTrackingForm");
    const messageEl = document.getElementById("updateTrackingMessage");
    const parcelSelect = document.getElementById("trackingParcelSelect");
    const statusBadge = document.getElementById("trackingCurrentStatusBadge");
    const nextStatusSelect = document.getElementById("trackingNextStatusSelect");
    const branchSelect = document.getElementById("trackingBranchSelect");
    const employeeSelect = document.getElementById("trackingEmployeeSelect");
    const checkpointInput = document.getElementById("trackingCheckpointInput");
    const submitBtn = document.getElementById("submitUpdateTrackingButton");

    if (!modal) return;
    if (form) form.reset();
    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }
    if (statusBadge) {
        statusBadge.textContent = "Select a parcel...";
        statusBadge.className = "";
    }

    if (parcelSelect) parcelSelect.innerHTML = `<option value="">Loading active parcels...</option>`;
    if (branchSelect) branchSelect.innerHTML = `<option value="">Loading hubs...</option>`;
    if (employeeSelect) employeeSelect.innerHTML = `<option value="">Loading employees...</option>`;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    try {
        const [parcelsRes, branchesRes, employeesRes] = await Promise.all([
            fetch("/api/tracking/active-parcels"),
            fetch("/api/branches"),
            fetch("/api/employees")
        ]);

        const parcels = parcelsRes.ok ? await parcelsRes.json() : [];
        const branches = branchesRes.ok ? await branchesRes.json() : [];
        const employees = employeesRes.ok ? await employeesRes.json() : [];

        // 1. Populate Active Parcels
        if (parcelSelect) {
            if (parcels.length === 0) {
                parcelSelect.innerHTML = `<option value="">No parcels currently in transit (all delivered)</option>`;
                if (submitBtn) submitBtn.disabled = true;
            } else {
                if (submitBtn) submitBtn.disabled = false;
                parcelSelect.innerHTML = `
                    <option value="">-- Choose a parcel to update --</option>
                    ${parcels.map(p => `
                        <option value="${p.parcel_id}" 
                                data-tracking="${p.tracking_number}" 
                                data-status="${p.status}" 
                                data-origin-branch="${p.origin_branch_id}" 
                                data-dest-branch="${p.destination_branch_id}"
                                data-emp="${p.employee_id || ''}">
                            ${escapeHtml(p.tracking_number)} [${p.status}] — ${escapeHtml(p.customer_name)} (${escapeHtml(p.origin_city)} → ${escapeHtml(p.destination_city)})
                        </option>
                    `).join("")}
                `;

                parcelSelect.onchange = () => {
                    const opt = parcelSelect.options[parcelSelect.selectedIndex];
                    if (opt && opt.value) {
                        const curStatus = opt.getAttribute("data-status") || "Pending";
                        const originB = opt.getAttribute("data-origin-branch");
                        const destB = opt.getAttribute("data-dest-branch");
                        const empId = opt.getAttribute("data-emp");

                        // Update current status badge
                        if (statusBadge) {
                            statusBadge.innerHTML = createStatusBadge(curStatus);
                        }

                        // Determine next status and preselect logical choice
                        if (nextStatusSelect) {
                            if (curStatus === "Pending") {
                                nextStatusSelect.value = "In Transit";
                            } else if (curStatus === "In Transit") {
                                nextStatusSelect.value = "Out for Delivery";
                            } else if (curStatus === "Out for Delivery") {
                                nextStatusSelect.value = "Delivered";
                            }
                        }

                        // Preselect branch
                        if (branchSelect) {
                            if (curStatus === "Out for Delivery" || (nextStatusSelect && nextStatusSelect.value === "Delivered")) {
                                if (destB) branchSelect.value = destB;
                            } else if (originB) {
                                branchSelect.value = originB;
                            }
                        }

                        // Preselect employee if known
                        if (employeeSelect && empId) {
                            employeeSelect.value = empId;
                        }
                    } else if (statusBadge) {
                        statusBadge.textContent = "Select a parcel...";
                    }
                };

                if (preselectParcelId) {
                    parcelSelect.value = String(preselectParcelId);
                    parcelSelect.dispatchEvent(new Event("change"));
                }
            }
        }

        // 2. Populate Branches
        if (branchSelect) {
            branchSelect.innerHTML = `
                <option value="">-- Choose scanning hub facility --</option>
                ${branches.map(b => `
                    <option value="${b.branch_id}">${escapeHtml(b.branch_name)} — ${escapeHtml(b.city)}, ${escapeHtml(b.state)}</option>
                `).join("")}
            `;
        }

        // 3. Populate Employees
        if (employeeSelect) {
            if (window.currentUser && window.currentUser.role === "Courier Partner") {
                employeeSelect.innerHTML = `
                    <option value="${window.currentUser.employee_id}" selected>
                        ${escapeHtml(window.currentUser.name)} — Courier Partner
                    </option>
                `;
            } else {
                employeeSelect.innerHTML = `
                    <option value="">-- Choose handling courier/officer --</option>
                    ${employees.map(e => `
                        <option value="${e.employee_id}">${escapeHtml(e.name)} — ${escapeHtml(e.role || "Officer")} (${escapeHtml(e.branch_name || "")})</option>
                    `).join("")}
                `;
            }
        }

    } catch (error) {
        console.error("Error loading update tracking modal options:", error);
        if (messageEl) {
            messageEl.textContent = "Failed to load options from the database.";
            messageEl.className = "form-message error";
        }
    }
}

function closeUpdateTrackingModal() {
    const modal = document.getElementById("updateTrackingModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function handleUpdateTrackingSubmit(event) {
    event.preventDefault();

    const messageEl = document.getElementById("updateTrackingMessage");
    const parcelSelect = document.getElementById("trackingParcelSelect");
    const nextStatusSelect = document.getElementById("trackingNextStatusSelect");
    const branchSelect = document.getElementById("trackingBranchSelect");
    const employeeSelect = document.getElementById("trackingEmployeeSelect");
    const checkpointInput = document.getElementById("trackingCheckpointInput");
    const submitBtn = document.getElementById("submitUpdateTrackingButton");

    const parcelId = parcelSelect ? parcelSelect.value : "";
    const status = nextStatusSelect ? nextStatusSelect.value : "";
    const branchId = branchSelect ? branchSelect.value : "";
    const employeeId = employeeSelect ? employeeSelect.value : "";
    const remarks = checkpointInput ? checkpointInput.value.trim() : "";

    if (!parcelId || !status || !branchId || !employeeId) {
        if (messageEl) {
            messageEl.textContent = "Please select a parcel, target status, hub facility, and handling officer.";
            messageEl.className = "form-message error";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Recording...</span>`;
    }

    try {
        const response = await fetch("/api/tracking/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                parcel_id: parseInt(parcelId, 10),
                status: status,
                branch_id: parseInt(branchId, 10),
                employee_id: parseInt(employeeId, 10),
                remarks: remarks
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to record tracking event");
        }

        closeUpdateTrackingModal();
        showToast("Tracking Event Recorded", `Parcel #${result.tracking_number} updated to ${result.status}.`);

        // Refresh tracking if currently viewing this parcel on the dashboard
        const currentTrackInput = document.getElementById("trackingNumber");
        if (currentTrackInput && currentTrackInput.value.trim() === result.tracking_number) {
            trackParcel();
        }

        // Refresh all relevant data
        loadDashboard();
        loadAlerts();
        loadParcels();
        loadShipmentsTable();
        loadShipmentStats();

    } catch (error) {
        console.error("Error submitting tracking event:", error);
        if (messageEl) {
            messageEl.textContent = error.message || "An unexpected error occurred.";
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-location-dot"></i><span>Record Event</span>`;
        }
    }
}


// =========================================================
// OPERATIONAL ALERTS & NOTIFICATIONS
// =========================================================

function setupOperationalAlerts() {
    const btn = document.getElementById("notificationButton");
    const dropdown = document.getElementById("notificationDropdown");

    if (btn && dropdown) {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const isOpen = dropdown.classList.contains("show");
            if (isOpen) {
                dropdown.classList.remove("show");
                dropdown.setAttribute("aria-hidden", "true");
                btn.setAttribute("aria-expanded", "false");
            } else {
                dropdown.classList.add("show");
                dropdown.setAttribute("aria-hidden", "false");
                btn.setAttribute("aria-expanded", "true");
                loadAlerts();
            }
        });

        dropdown.addEventListener("click", event => {
            event.stopPropagation();
        });

        document.addEventListener("click", () => {
            if (dropdown.classList.contains("show")) {
                dropdown.classList.remove("show");
                dropdown.setAttribute("aria-hidden", "true");
                btn.setAttribute("aria-expanded", "false");
            }
        });
    }
}

async function loadAlerts() {
    const badge = document.getElementById("notificationBadge");
    const headerBadge = document.getElementById("notificationHeaderBadge");
    const listEl = document.getElementById("notificationList");

    try {
        const response = await fetch("/api/alerts");
        if (!response.ok) return;
        const data = await response.json();

        const count = data.total_alerts || 0;
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? "inline-block" : "none";
        }
        if (headerBadge) {
            headerBadge.textContent = `${count} active`;
            headerBadge.className = `status-badge ${count > 0 ? 'status-out' : 'status-delivered'}`;
        }

        if (!listEl) return;

        if (count === 0) {
            listEl.innerHTML = `<div class="empty-state" style="padding: 24px; font-size: 13px;"><i class="fa-solid fa-circle-check" style="color: #4ade80; margin-right: 6px;"></i>All operational queues are clear!</div>`;
            return;
        }

        let html = "";

        // 1. Parcels awaiting assignment
        if (data.unassigned_parcels && data.unassigned_parcels.length > 0) {
            data.unassigned_parcels.forEach(p => {
                html += `
                    <div class="alert-item">
                        <div class="alert-icon amber">
                            <i class="fa-solid fa-truck"></i>
                        </div>
                        <div class="alert-body">
                            <div class="alert-body-title">
                                <span>Awaiting Assignment</span>
                                <small style="color: #808ea3; font-weight: 500;">${escapeHtml(p.parcel_type)}</small>
                            </div>
                            <div class="alert-body-desc">
                                <strong>#${escapeHtml(p.tracking_number)}</strong> (${p.weight} kg) • ${escapeHtml(p.origin_city)} → ${escapeHtml(p.destination_city)}
                            </div>
                            <button class="alert-action-btn" onclick="openAssignShipmentModal()">
                                <i class="fa-solid fa-truck-fast"></i> Assign Shipment
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        // 2. Pending / Unpaid Payments
        if (data.pending_payments && data.pending_payments.length > 0) {
            data.pending_payments.forEach(py => {
                html += `
                    <div class="alert-item">
                        <div class="alert-icon red">
                            <i class="fa-solid fa-credit-card"></i>
                        </div>
                        <div class="alert-body">
                            <div class="alert-body-title">
                                <span>Pending Payment</span>
                                <strong style="color: #f87171;">₹${Number(py.amount).toFixed(2)}</strong>
                            </div>
                            <div class="alert-body-desc">
                                Invoice #${py.payment_id} for ${escapeHtml(py.customer_name)} (Parcel #${escapeHtml(py.tracking_number)})
                            </div>
                            <button class="alert-action-btn" onclick="switchToView('payments')">
                                <i class="fa-solid fa-receipt"></i> Settle Invoice
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        // 3. Unbilled Parcels
        if (data.unbilled_parcels && data.unbilled_parcels.length > 0) {
            data.unbilled_parcels.forEach(ub => {
                html += `
                    <div class="alert-item">
                        <div class="alert-icon blue">
                            <i class="fa-solid fa-file-invoice"></i>
                        </div>
                        <div class="alert-body">
                            <div class="alert-body-title">
                                <span>Unbilled Parcel</span>
                                <strong style="color: #60a5fa;">₹${Number(ub.shipping_cost).toFixed(2)}</strong>
                            </div>
                            <div class="alert-body-desc">
                                #${escapeHtml(ub.tracking_number)} • Sender: ${escapeHtml(ub.customer_name)}
                            </div>
                            <button class="alert-action-btn" onclick="openCreatePaymentModal()">
                                <i class="fa-solid fa-plus"></i> Generate Invoice
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        // 4. Low customer ratings
        if (data.low_ratings && data.low_ratings.length > 0) {
            data.low_ratings.forEach(fb => {
                html += `
                    <div class="alert-item">
                        <div class="alert-icon red">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div class="alert-body">
                            <div class="alert-body-title">
                                <span>Low Rating: ${fb.rating}/5</span>
                                <small style="color: #808ea3;">#${escapeHtml(fb.tracking_number)}</small>
                            </div>
                            <div class="alert-body-desc">
                                "${escapeHtml(fb.comments || 'No comment provided')}" — ${escapeHtml(fb.customer_name)}
                            </div>
                            <button class="alert-action-btn" onclick="switchToView('feedback')">
                                <i class="fa-solid fa-eye"></i> View Feedback
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        listEl.innerHTML = html;
    } catch (err) {
        console.error("Error loading operational alerts:", err);
    }
}


// =========================================================
// CUSTOMERS MANAGEMENT
// =========================================================

let customerSearchDebounceTimer = null;
let currentViewingCustomerId = null;

function setupCustomersView() {
    const searchInput = document.getElementById("customersSearchInput");
    const activityFilter = document.getElementById("customersActivityFilter");
    const clearButton = document.getElementById("clearCustomersSearch");
    const refreshButton = document.getElementById("refreshCustomersButton");
    const newCustomerButton = document.getElementById("newCustomerButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(customerSearchDebounceTimer);
            customerSearchDebounceTimer = setTimeout(() => {
                loadCustomersTable();
            }, 300);
        });
    }

    if (activityFilter) {
        activityFilter.addEventListener("change", () => {
            loadCustomersTable();
        });
    }

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (activityFilter) activityFilter.value = "";
            loadCustomersTable();
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadCustomerStats();
            loadCustomersTable();
            showToast("Customers Refreshed", "Live customer profiles and KPIs updated from database.");
        });
    }

    if (newCustomerButton) {
        newCustomerButton.addEventListener("click", () => {
            openCustomerModal();
        });
    }

    // Customer Details Modal listeners
    const detailsModal = document.getElementById("customerDetailsModal");
    const closeDetailsBtn = document.getElementById("closeCustomerDetailsModal");
    const closeDetailsActionBtn = document.getElementById("closeCustomerDetailsButton");
    const editFromDetailsBtn = document.getElementById("editCustomerFromDetailsButton");

    if (closeDetailsBtn) closeDetailsBtn.addEventListener("click", closeCustomerDetailsModal);
    if (closeDetailsActionBtn) closeDetailsActionBtn.addEventListener("click", closeCustomerDetailsModal);

    if (editFromDetailsBtn) {
        editFromDetailsBtn.addEventListener("click", () => {
            const customerId = currentViewingCustomerId;
            closeCustomerDetailsModal();
            if (customerId) {
                openCustomerModal(customerId);
            }
        });
    }

    if (detailsModal) {
        detailsModal.addEventListener("click", event => {
            if (event.target === detailsModal) {
                closeCustomerDetailsModal();
            }
        });
    }

    // Customer Create/Edit Modal listeners
    const customerModal = document.getElementById("customerModal");
    const closeCustomerModalBtn = document.getElementById("closeCustomerModal");
    const cancelCustomerModalBtn = document.getElementById("cancelCustomerModal");
    const customerForm = document.getElementById("customerForm");

    if (closeCustomerModalBtn) closeCustomerModalBtn.addEventListener("click", closeCustomerModal);
    if (cancelCustomerModalBtn) cancelCustomerModalBtn.addEventListener("click", closeCustomerModal);

    if (customerModal) {
        customerModal.addEventListener("click", event => {
            if (event.target === customerModal) {
                closeCustomerModal();
            }
        });
    }

    if (customerForm) {
        customerForm.addEventListener("submit", handleCustomerFormSubmit);
    }

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            if (detailsModal && detailsModal.classList.contains("show")) {
                closeCustomerDetailsModal();
            }
            if (customerModal && customerModal.classList.contains("show")) {
                closeCustomerModal();
            }
        }
    });
}


async function loadCustomerStats() {
    try {
        const response = await fetch("/api/customers/stats");
        if (!response.ok) throw new Error("Failed to load customer stats");

        const stats = await response.json();

        const totalEl = document.getElementById("totalCustomersCount");
        const activeEl = document.getElementById("activeCustomersCount");
        const inactiveEl = document.getElementById("inactiveCustomersCount");
        const parcelsEl = document.getElementById("totalCustomerParcelsCount");

        if (totalEl) totalEl.textContent = stats.total_customers ?? 0;
        if (activeEl) activeEl.textContent = stats.active_customers ?? 0;
        if (inactiveEl) inactiveEl.textContent = stats.inactive_customers ?? 0;
        if (parcelsEl) parcelsEl.textContent = stats.total_parcels ?? 0;
    } catch (error) {
        console.error("Error loading customer stats:", error);
    }
}


async function loadCustomersTable() {
    const tableBody = document.getElementById("customersTableBody");
    const countDisplay = document.getElementById("customersCountDisplay");
    const searchInput = document.getElementById("customersSearchInput");
    const activityFilter = document.getElementById("customersActivityFilter");

    if (!tableBody) return;

    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const selectedActivity = activityFilter ? activityFilter.value.trim() : "";

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedActivity) params.append("activity", selectedActivity);

    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Loading customer profiles from database...
            </td>
        </tr>
    `;

    try {
        const url = `/api/customers${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load customers");
        }

        const customers = await response.json();

        if (countDisplay) {
            if (customers.length === 0) {
                countDisplay.textContent = "0 customers found";
            } else if (customers.length === 1) {
                countDisplay.textContent = "1 customer found";
            } else {
                countDisplay.textContent = `${customers.length} customers found`;
            }
        }

        renderCustomersTable(customers);
    } catch (error) {
        console.error("Error loading customers:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state error-message">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
                    Failed to load customer records. Please try refreshing.
                </td>
            </tr>
        `;
        if (countDisplay) countDisplay.textContent = "Error loading customers";
    }
}


function renderCustomersTable(customers) {
    const tableBody = document.getElementById("customersTableBody");
    if (!tableBody) return;

    if (!customers || customers.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-state">
                    <div style="padding: 24px 0; text-align: center;">
                        <i class="fa-solid fa-user-slash" style="font-size: 32px; color: #475569; margin-bottom: 12px; display: block;"></i>
                        <strong style="color: #cbd5e1; font-size: 15px; display: block; margin-bottom: 4px;">No customers found</strong>
                        <span style="color: #64748b; font-size: 13px;">No customer records match your current filters or query.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = customers.map(c => {
        const hasActivity = (c.total_parcels || 0) > 0;
        const activityBadge = hasActivity
            ? `<span class="count-pill" style="padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">${c.total_shipments || 0} shipments</span>`
            : `<span class="count-pill" style="padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600; background: rgba(100, 116, 139, 0.15); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.3);">0 shipments</span>`;

        return `
            <tr class="clickable-row" data-customer-id="${c.customer_id}">
                <td>
                    <span class="tracking-pill">
                        #CUST-${c.customer_id}
                    </span>
                </td>
                <td>
                    <strong style="color: #f1f5f9; font-size: 13.5px;">
                        ${escapeHtml(c.name)}
                    </strong>
                </td>
                <td>
                    <span style="font-family: monospace; color: #cbd5e1; font-size: 13px;">
                        ${escapeHtml(c.phone || "N/A")}
                    </span>
                </td>
                <td>
                    <span style="color: #94a3b8; font-size: 13px;">
                        ${escapeHtml(c.email || "N/A")}
                    </span>
                </td>
                <td>
                    <span style="color: #cbd5e1; font-size: 13px; max-width: 220px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(c.address || "")}">
                        ${escapeHtml(c.address || "N/A")}
                    </span>
                </td>
                <td>
                    <span style="color: #cbd5e1; font-size: 13px; font-weight: 600;">
                        ${c.parcels_sent ?? 0} sent
                    </span>
                </td>
                <td>
                    <span style="color: #cbd5e1; font-size: 13px; font-weight: 600;">
                        ${c.parcels_received ?? 0} rec'd
                    </span>
                </td>
                <td>
                    ${activityBadge}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 6px;">
                        <button
                            class="secondary-button action-btn-view view-customer-btn"
                            data-customer-id="${c.customer_id}"
                            title="Inspect Profile &amp; Parcels"
                        >
                            <i class="fa-solid fa-eye"></i>
                            <span>View</span>
                        </button>
                        <button
                            class="secondary-button action-btn-edit edit-customer-btn"
                            data-customer-id="${c.customer_id}"
                            title="Edit Customer Profile"
                        >
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button
                            class="secondary-button action-btn-delete delete-customer-btn"
                            data-customer-id="${c.customer_id}"
                            data-customer-name="${escapeHtml(c.name)}"
                            title="Delete Customer Profile"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");

    // Bind row clicks
    tableBody.querySelectorAll(".clickable-row").forEach(row => {
        row.addEventListener("click", event => {
            if (event.target.closest("button")) return;
            const customerId = row.getAttribute("data-customer-id");
            if (customerId) viewCustomerDetails(customerId);
        });
    });

    // Bind action buttons
    tableBody.querySelectorAll(".view-customer-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const customerId = btn.getAttribute("data-customer-id");
            if (customerId) viewCustomerDetails(customerId);
        });
    });

    tableBody.querySelectorAll(".edit-customer-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const customerId = btn.getAttribute("data-customer-id");
            if (customerId) openCustomerModal(customerId);
        });
    });

    tableBody.querySelectorAll(".delete-customer-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.stopPropagation();
            const customerId = btn.getAttribute("data-customer-id");
            const customerName = btn.getAttribute("data-customer-name") || "this customer";
            if (customerId) deleteCustomer(customerId, customerName);
        });
    });
}


async function viewCustomerDetails(customerId) {
    const modal = document.getElementById("customerDetailsModal");
    if (!modal) return;

    try {
        const response = await fetch(`/api/customers/${customerId}`);
        if (!response.ok) {
            throw new Error("Failed to load customer details");
        }

        const c = await response.json();
        currentViewingCustomerId = c.customer_id;

        const nameEl = document.getElementById("detailCustomerName");
        const metaEl = document.getElementById("detailCustomerMeta");
        const phoneEl = document.getElementById("detailCustomerPhone");
        const emailEl = document.getElementById("detailCustomerEmail");
        const addressEl = document.getElementById("detailCustomerAddress");
        const sentEl = document.getElementById("detailCustomerParcelsSent");
        const recEl = document.getElementById("detailCustomerParcelsReceived");
        const shipEl = document.getElementById("detailCustomerShipments");
        const parcelsTable = document.getElementById("detailCustomerParcelsTable");
        const shipmentsTable = document.getElementById("detailCustomerShipmentsTable");

        if (nameEl) nameEl.textContent = c.name || "Customer";
        if (metaEl) metaEl.textContent = `Customer ID: #CUST-${c.customer_id}`;
        if (phoneEl) phoneEl.textContent = c.phone || "N/A";
        if (emailEl) emailEl.textContent = c.email || "N/A";
        if (addressEl) addressEl.textContent = c.address || "N/A";
        if (sentEl) sentEl.textContent = `${c.parcels_sent ?? 0} parcel(s)`;
        if (recEl) recEl.textContent = `${c.parcels_received ?? 0} parcel(s)`;
        if (shipEl) shipEl.textContent = `${c.total_shipments ?? 0} shipment(s)`;

        // Render Parcels History
        if (parcelsTable) {
            const parcels = c.parcels || [];
            if (parcels.length === 0) {
                parcelsTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">No associated parcels recorded for this customer.</td>
                    </tr>
                `;
            } else {
                parcelsTable.innerHTML = parcels.map(p => `
                    <tr>
                        <td>
                            <strong style="color: #f1f5f9; font-family: monospace; font-size: 13px;">${escapeHtml(p.tracking_number)}</strong>
                        </td>
                        <td>
                            <span class="count-pill" style="padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; background: ${p.role === 'Sender' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(34, 197, 94, 0.15)'}; color: ${p.role === 'Sender' ? '#38bdf8' : '#4ade80'};">
                                ${p.role}
                            </span>
                        </td>
                        <td>
                            <span style="font-size: 12.5px; color: #cbd5e1;">${escapeHtml(p.origin_city)} → ${escapeHtml(p.destination_city)}</span>
                        </td>
                        <td>
                            <span style="font-size: 12px; color: #94a3b8;">${escapeHtml(p.parcel_type)} (${p.weight} kg)</span>
                        </td>
                        <td>
                            ${createStatusBadge(p.status || "Pending")}
                        </td>
                        <td>
                            <span style="font-size: 12px; color: #94a3b8;">${escapeHtml(p.booking_date || "N/A")}</span>
                        </td>
                    </tr>
                `).join("");
            }
        }

        // Render Shipments History
        if (shipmentsTable) {
            const shipments = c.shipments || [];
            if (shipments.length === 0) {
                shipmentsTable.innerHTML = `
                    <tr>
                        <td colspan="6" class="empty-state">No dispatched shipments associated with this customer.</td>
                    </tr>
                `;
            } else {
                shipmentsTable.innerHTML = shipments.map(s => `
                    <tr>
                        <td>
                            <span class="tracking-pill">#SHP-${s.shipment_id}</span>
                        </td>
                        <td>
                            <strong style="color: #f1f5f9; font-family: monospace; font-size: 13px;">${escapeHtml(s.tracking_number)}</strong>
                        </td>
                        <td>
                            <span style="font-size: 12.5px; color: #cbd5e1;">${escapeHtml(s.route)}</span>
                        </td>
                        <td>
                            <span style="font-size: 12.5px; font-family: monospace; color: #f8fafc;">${escapeHtml(s.vehicle_number)}</span>
                        </td>
                        <td>
                            <span style="font-size: 12.5px; color: #cbd5e1;">${escapeHtml(s.employee_name)}</span>
                        </td>
                        <td>
                            <span style="font-size: 12px; color: #94a3b8;">${escapeHtml(s.shipment_date || "N/A")}</span>
                        </td>
                    </tr>
                `).join("");
            }
        }

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    } catch (error) {
        console.error("Error viewing customer details:", error);
        showToast("Error", "Could not load customer profile from the server.");
    }
}


function closeCustomerDetailsModal() {
    const modal = document.getElementById("customerDetailsModal");
    currentViewingCustomerId = null;
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


async function openCustomerModal(customerId = null) {
    const modal = document.getElementById("customerModal");
    const form = document.getElementById("customerForm");
    const titleEl = document.getElementById("customerModalTitle");
    const subtitleEl = document.getElementById("customerModalSubtitle");
    const idInput = document.getElementById("customerFormId");
    const nameInput = document.getElementById("customerNameInput");
    const emailInput = document.getElementById("customerEmailInput");
    const phoneInput = document.getElementById("customerPhoneInput");
    const addressInput = document.getElementById("customerAddressInput");
    const messageEl = document.getElementById("customerFormMessage");

    if (!modal) return;

    if (form) form.reset();
    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }

    if (customerId) {
        if (titleEl) titleEl.textContent = "Edit Customer Profile";
        if (subtitleEl) subtitleEl.textContent = "Update contact and address information.";
        if (idInput) idInput.value = customerId;

        try {
            const response = await fetch(`/api/customers/${customerId}`);
            if (!response.ok) throw new Error("Failed to load customer profile for editing");
            const c = await response.json();

            if (nameInput) nameInput.value = c.name || "";
            if (emailInput) emailInput.value = c.email || "";
            if (phoneInput) phoneInput.value = c.phone || "";
            if (addressInput) addressInput.value = c.address || "";
        } catch (error) {
            console.error("Error loading customer for edit:", error);
            if (messageEl) {
                messageEl.textContent = "Failed to load customer data. Please try again.";
                messageEl.className = "form-message error";
            }
        }
    } else {
        if (titleEl) titleEl.textContent = "New Customer";
        if (subtitleEl) subtitleEl.textContent = "Register a new customer profile.";
        if (idInput) idInput.value = "";
    }

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}


function closeCustomerModal() {
    const modal = document.getElementById("customerModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


async function handleCustomerFormSubmit(event) {
    event.preventDefault();

    const idInput = document.getElementById("customerFormId");
    const nameInput = document.getElementById("customerNameInput");
    const emailInput = document.getElementById("customerEmailInput");
    const phoneInput = document.getElementById("customerPhoneInput");
    const addressInput = document.getElementById("customerAddressInput");
    const messageEl = document.getElementById("customerFormMessage");
    const submitBtn = document.getElementById("submitCustomerButton");

    const customerId = idInput ? idInput.value.trim() : "";
    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const address = addressInput ? addressInput.value.trim() : "";

    // Frontend validation
    if (!name || !email || !phone || !address) {
        if (messageEl) {
            messageEl.textContent = "All fields are required.";
            messageEl.className = "form-message error";
        }
        return;
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
        if (messageEl) {
            messageEl.textContent = "Please enter a valid email address.";
            messageEl.className = "form-message error";
        }
        return;
    }

    if (!/^\d{10}$/.test(phone)) {
        if (messageEl) {
            messageEl.textContent = "Phone number must contain exactly 10 digits.";
            messageEl.className = "form-message error";
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>`;
    }

    try {
        const isEdit = Boolean(customerId);
        const url = isEdit ? `/api/customers/${customerId}` : "/api/customers";
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, phone, address })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Failed to save customer");
        }

        closeCustomerModal();
        showToast(
            isEdit ? "Customer Updated" : "Customer Created",
            `Profile for '${result.name}' saved successfully.`
        );

        // Refresh views
        loadCustomerStats();
        loadCustomersTable();
        loadDashboard();
        loadCustomers();

    } catch (error) {
        console.error("Error saving customer:", error);
        if (messageEl) {
            messageEl.textContent = error.message || "An unexpected error occurred.";
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Save Customer</span>`;
        }
    }
}


async function deleteCustomer(customerId, customerName) {
    const confirmed = confirm(`Are you sure you want to delete customer '${customerName}' (#CUST-${customerId})?\n\nIf this customer is linked to existing parcels, deletion will be safely blocked.`);
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/customers/${customerId}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Could not delete customer.");
            showToast("Deletion Blocked", result.error || "Referential integrity preserved.");
            return;
        }

        showToast("Customer Deleted", result.message || "Customer profile removed.");
        loadCustomerStats();
        loadCustomersTable();
        loadDashboard();
        loadCustomers();

    } catch (error) {
        console.error("Error deleting customer:", error);
        showToast("Error", error.message || "Failed to communicate with server.");
    }
}


// =========================================================
// EMPLOYEE MANAGEMENT
// =========================================================

let employeeSearchDebounceTimer = null;

function setupEmployeesView() {
    const searchInput = document.getElementById("employeesSearchInput");
    const statusFilter = document.getElementById("employeeStatusFilter");
    const branchFilter = document.getElementById("employeeBranchFilter");
    const resetBtn = document.getElementById("resetEmployeeFilters");
    const refreshBtn = document.getElementById("refreshEmployeesButton");
    const newBtn = document.getElementById("newEmployeeButton");
    const closeBtn = document.getElementById("closeEmployeeModal");
    const cancelBtn = document.getElementById("cancelEmployeeModal");
    const form = document.getElementById("employeeForm");
    const closeDetailsBtn = document.getElementById("closeEmployeeDetailsModal");
    const dismissDetailsBtn = document.getElementById("dismissEmployeeDetailsButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(employeeSearchDebounceTimer);
            employeeSearchDebounceTimer = setTimeout(() => {
                loadEmployeesTable();
            }, 300);
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => loadEmployeesTable());
    }

    if (branchFilter) {
        branchFilter.addEventListener("change", () => loadEmployeesTable());
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
            if (branchFilter) branchFilter.value = "";
            loadEmployeesTable();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadEmployeeStats();
            loadEmployeesTable();
            showToast("Employees Refreshed", "Staff directory reloaded from MySQL.");
        });
    }

    if (newBtn) {
        newBtn.addEventListener("click", () => openEmployeeModal());
    }

    if (closeBtn) closeBtn.addEventListener("click", closeEmployeeModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeEmployeeModal);
    if (form) form.addEventListener("submit", handleEmployeeFormSubmit);
    if (closeDetailsBtn) closeDetailsBtn.addEventListener("click", closeEmployeeDetailsModal);
    if (dismissDetailsBtn) dismissDetailsBtn.addEventListener("click", closeEmployeeDetailsModal);
}

async function loadEmployeeStats() {
    try {
        const response = await fetch("/api/employees/stats");
        if (!response.ok) throw new Error("Failed to load employee stats");
        const data = await response.json();

        const totalEl = document.getElementById("totalEmployeesCount");
        const activeEl = document.getElementById("activeEmployeesCount");
        const inactiveEl = document.getElementById("inactiveEmployeesCount");

        if (totalEl) totalEl.textContent = data.total_employees;
        if (activeEl) activeEl.textContent = data.active_employees;
        if (inactiveEl) inactiveEl.textContent = data.inactive_employees;
    } catch (error) {
        console.error("Employee stats error:", error);
    }
}

async function loadBranchesForEmployeeFilter() {
    const branchFilter = document.getElementById("employeeBranchFilter");
    const branchSelect = document.getElementById("employeeBranchSelect");
    if (!branchFilter && !branchSelect) return;

    try {
        const response = await fetch("/api/branches");
        if (!response.ok) return;
        const branches = await response.json();

        if (branchFilter) {
            const currentVal = branchFilter.value;
            branchFilter.innerHTML = '<option value="">All Branches</option>';
            branches.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b.branch_id;
                opt.textContent = `${b.branch_name} (${b.city})`;
                branchFilter.appendChild(opt);
            });
            branchFilter.value = currentVal;
        }

        if (branchSelect) {
            branchSelect.innerHTML = '<option value="">Select branch</option>';
            branches.forEach(b => {
                const opt = document.createElement("option");
                opt.value = b.branch_id;
                opt.textContent = `${b.branch_name} (${b.city})`;
                branchSelect.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load branches for employee filter:", e);
    }
}

async function loadEmployeesTable() {
    const tableBody = document.getElementById("employeesTableBody");
    if (!tableBody) return;

    const searchInput = document.getElementById("employeesSearchInput");
    const statusFilter = document.getElementById("employeeStatusFilter");
    const branchFilter = document.getElementById("employeeBranchFilter");

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append("search", searchInput.value.trim());
    if (statusFilter && statusFilter.value) params.append("status", statusFilter.value);
    if (branchFilter && branchFilter.value) params.append("branch_id", branchFilter.value);

    try {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Loading employees...</td></tr>`;

        const response = await fetch(`/api/employees?${params.toString()}`);
        if (!response.ok) throw new Error("Could not load employees");
        const employees = await response.json();

        if (!employees || employees.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No matching employees found</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        employees.forEach(emp => {
            const tr = document.createElement("tr");
            const statusClass = emp.status === "Active" ? "status-delivered" : "status-out";
            const toggleIcon = emp.status === "Active" ? "fa-user-slash" : "fa-user-check";
            const toggleTitle = emp.status === "Active" ? "Deactivate Employee" : "Reactivate Employee";

            tr.innerHTML = `
                <td><strong>#EMP-${emp.employee_id}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #f2f4f7;">${escapeHtml(emp.name)}</div>
                    ${emp.active_shipments > 0 ? `<small style="color: #60a5fa;"><i class="fa-solid fa-truck" style="margin-right: 4px;"></i>${emp.active_shipments} active in transit</small>` : ''}
                </td>
                <td>${escapeHtml(emp.phone)}</td>
                <td><span style="color: #cbd5e1; font-size: 13px;">${escapeHtml(emp.email || 'N/A')}</span></td>
                <td><span class="cell-subtext" style="color: #e2e8f0; font-weight: 600;">${escapeHtml(emp.role)}</span></td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(emp.branch_name)}</div>
                    <small style="color: #808ea3;">${escapeHtml(emp.city)}</small>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${escapeHtml(emp.status || 'Active')}
                    </span>
                </td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="ghost-button" onclick="viewEmployeeDetails(${emp.employee_id})" title="View Employee Details">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="ghost-button" onclick='openEmployeeModal(${JSON.stringify(emp).replace(/'/g, "&apos;")})' title="Edit Employee">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button type="button" class="ghost-button" onclick="toggleEmployeeStatus(${emp.employee_id})" title="${toggleTitle}">
                            <i class="fa-solid ${toggleIcon}"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading employees table:", error);
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: #f87171;">Failed to load employees. Check database connection.</td></tr>`;
    }
}

async function openEmployeeModal(emp = null) {
    const modal = document.getElementById("employeeModal");
    const title = document.getElementById("employeeModalTitle");
    const subtitle = document.getElementById("employeeModalSubtitle");
    const idInput = document.getElementById("employeeFormId");
    const nameInput = document.getElementById("employeeNameInput");
    const emailInput = document.getElementById("employeeEmailInput");
    const phoneInput = document.getElementById("employeePhoneInput");
    const roleInput = document.getElementById("employeeRoleInput");
    const branchSelect = document.getElementById("employeeBranchSelect");
    const statusSelect = document.getElementById("employeeStatusSelect");
    const messageEl = document.getElementById("employeeFormMessage");

    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }

    await loadBranchesForEmployeeFilter();

    if (emp) {
        if (title) title.textContent = "Edit Employee";
        if (subtitle) subtitle.textContent = `Update employee profile details (#EMP-${emp.employee_id}).`;
        if (idInput) idInput.value = emp.employee_id;
        if (nameInput) nameInput.value = emp.name;
        if (emailInput) emailInput.value = emp.email || "";
        if (phoneInput) phoneInput.value = emp.phone;
        if (roleInput) roleInput.value = emp.role;
        if (branchSelect) branchSelect.value = emp.branch_id;
        if (statusSelect) statusSelect.value = emp.status || "Active";
    } else {
        if (title) title.textContent = "New Employee";
        if (subtitle) subtitle.textContent = "Register a new staff profile and branch assignment.";
        if (idInput) idInput.value = "";
        if (nameInput) nameInput.value = "";
        if (emailInput) emailInput.value = "";
        if (phoneInput) phoneInput.value = "";
        if (roleInput) roleInput.value = "";
        if (branchSelect) branchSelect.value = "";
        if (statusSelect) statusSelect.value = "Active";
    }

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeEmployeeModal() {
    const modal = document.getElementById("employeeModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function handleEmployeeFormSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById("employeeFormId");
    const nameInput = document.getElementById("employeeNameInput");
    const emailInput = document.getElementById("employeeEmailInput");
    const phoneInput = document.getElementById("employeePhoneInput");
    const roleInput = document.getElementById("employeeRoleInput");
    const branchSelect = document.getElementById("employeeBranchSelect");
    const statusSelect = document.getElementById("employeeStatusSelect");
    const messageEl = document.getElementById("employeeFormMessage");
    const submitBtn = document.getElementById("submitEmployeeButton");

    const empId = idInput ? idInput.value.trim() : "";
    const isEdit = Boolean(empId);

    const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        phone: phoneInput.value.trim(),
        role: roleInput.value.trim(),
        branch_id: parseInt(branchSelect.value, 10),
        status: statusSelect.value
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>`;
        }

        const url = isEdit ? `/api/employees/${empId}` : "/api/employees";
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to save employee profile.");
        }

        closeEmployeeModal();
        showToast(isEdit ? "Employee Updated" : "Employee Created", isEdit ? "Staff profile updated successfully." : "New staff member registered in MySQL.");
        loadEmployeeStats();
        loadEmployeesTable();
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message;
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Save Employee</span>`;
        }
    }
}

async function viewEmployeeDetails(employeeId) {
    const modal = document.getElementById("employeeDetailsModal");
    const nameEl = document.getElementById("detailEmployeeName");
    const metaEl = document.getElementById("detailEmployeeMeta");
    const statusEl = document.getElementById("detailEmployeeStatus");
    const roleEl = document.getElementById("detailEmployeeRole");
    const contactEl = document.getElementById("detailEmployeeContact");
    const branchEl = document.getElementById("detailEmployeeBranch");
    const totalShipmentsEl = document.getElementById("detailEmployeeTotalShipments");
    const activeShipmentsEl = document.getElementById("detailEmployeeActiveShipments");
    const tableBody = document.getElementById("detailEmployeeShipmentsTable");

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    try {
        if (nameEl) nameEl.textContent = "Loading employee...";
        if (metaEl) metaEl.textContent = `Employee ID: #EMP-${employeeId}`;

        const response = await fetch(`/api/employees/${employeeId}`);
        if (!response.ok) throw new Error("Could not load employee details");
        const emp = await response.json();

        if (nameEl) nameEl.textContent = emp.name;
        if (metaEl) metaEl.textContent = `Employee ID: #EMP-${emp.employee_id} • Assigned Hub: ${emp.branch_name}`;
        if (statusEl) {
            const statusClass = emp.status === "Active" ? "status-delivered" : "status-out";
            statusEl.innerHTML = `<span class="status-badge ${statusClass}">${escapeHtml(emp.status)}</span>`;
        }
        if (roleEl) roleEl.textContent = emp.role;
        if (contactEl) contactEl.innerHTML = `<div><i class="fa-solid fa-phone" style="width: 16px; margin-right: 6px; color: #808ea3;"></i>${escapeHtml(emp.phone)}</div><div style="margin-top: 4px;"><i class="fa-solid fa-envelope" style="width: 16px; margin-right: 6px; color: #808ea3;"></i>${escapeHtml(emp.email || 'N/A')}</div>`;
        if (branchEl) branchEl.innerHTML = `<div>${escapeHtml(emp.branch_name)}</div><small style="color: #808ea3;">${escapeHtml(emp.city)}, ${escapeHtml(emp.state)}</small>`;
        if (totalShipmentsEl) totalShipmentsEl.textContent = emp.total_shipments || 0;
        if (activeShipmentsEl) activeShipmentsEl.textContent = emp.active_shipments || 0;

        if (tableBody) {
            if (!emp.shipments || emp.shipments.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No shipments assigned to this employee yet</td></tr>`;
            } else {
                tableBody.innerHTML = "";
                emp.shipments.forEach(s => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td><strong>${escapeHtml(s.tracking_number)}</strong></td>
                        <td>${createStatusBadge(s.parcel_status)}</td>
                        <td>${escapeHtml(s.origin_city)} → ${escapeHtml(s.destination_city)}</td>
                        <td>${escapeHtml(s.vehicle_number)}</td>
                        <td>${escapeHtml(s.shipment_date)}</td>
                    `;
                    tableBody.appendChild(row);
                });
            }
        }
    } catch (error) {
        console.error("Error viewing employee details:", error);
        showToast("Error", "Could not load employee details.");
    }
}

function closeEmployeeDetailsModal() {
    const modal = document.getElementById("employeeDetailsModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function toggleEmployeeStatus(employeeId) {
    try {
        const response = await fetch(`/api/employees/${employeeId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (!response.ok) {
            alert(result.error || "Cannot change employee status.");
            showToast("Action Blocked", result.error || "Cannot deactivate employee.", "error");
            return;
        }

        showToast("Status Updated", result.message);
        loadEmployeeStats();
        loadEmployeesTable();
    } catch (error) {
        console.error("Error toggling employee status:", error);
        showToast("Error", error.message || "Failed to update status.");
    }
}


// =========================================================
// PAYMENTS MANAGEMENT
// =========================================================

let paymentsSearchDebounceTimer = null;
let currentActivePaymentIdForQr = null;

function setupPaymentsView() {
    const searchInput = document.getElementById("paymentsSearchInput");
    const statusFilter = document.getElementById("paymentStatusFilter");
    const methodFilter = document.getElementById("paymentMethodFilter");
    const resetBtn = document.getElementById("resetPaymentFilters");
    const refreshBtn = document.getElementById("refreshPaymentsButton");
    const newBtn = document.getElementById("newPaymentButton");
    const closeBtn = document.getElementById("closePaymentModal");
    const cancelBtn = document.getElementById("cancelPaymentModal");
    const form = document.getElementById("paymentForm");
    const parcelSelect = document.getElementById("paymentParcelSelect");
    const closeDetailsBtn = document.getElementById("closePaymentDetailsModal");
    const dismissDetailsBtn = document.getElementById("dismissPaymentDetailsButton");
    const detailsQrBtn = document.getElementById("paymentDetailsQrButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(paymentsSearchDebounceTimer);
            paymentsSearchDebounceTimer = setTimeout(() => {
                loadPaymentsTable();
            }, 300);
        });
    }

    if (statusFilter) statusFilter.addEventListener("change", () => loadPaymentsTable());
    if (methodFilter) methodFilter.addEventListener("change", () => loadPaymentsTable());

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
            if (methodFilter) methodFilter.value = "";
            loadPaymentsTable();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadPaymentStats();
            loadPaymentsTable();
            showToast("Payments Refreshed", "Transaction history reloaded.");
        });
    }

    if (newBtn) newBtn.addEventListener("click", openCreatePaymentModal);
    if (closeBtn) closeBtn.addEventListener("click", closePaymentModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closePaymentModal);
    if (form) form.addEventListener("submit", handlePaymentFormSubmit);

    if (parcelSelect) {
        parcelSelect.addEventListener("change", () => {
            const selectedOpt = parcelSelect.options[parcelSelect.selectedIndex];
            const customerDisplay = document.getElementById("paymentCustomerDisplay");
            const amountInput = document.getElementById("paymentAmountInput");

            if (selectedOpt && selectedOpt.dataset.customer) {
                if (customerDisplay) customerDisplay.value = selectedOpt.dataset.customer;
                if (amountInput) amountInput.value = selectedOpt.dataset.cost || "";
            } else {
                if (customerDisplay) customerDisplay.value = "";
                if (amountInput) amountInput.value = "";
            }
        });
    }

    if (closeDetailsBtn) closeDetailsBtn.addEventListener("click", closePaymentDetailsModal);
    if (dismissDetailsBtn) dismissDetailsBtn.addEventListener("click", closePaymentDetailsModal);

    if (detailsQrBtn) {
        detailsQrBtn.addEventListener("click", () => {
            closePaymentDetailsModal();
            if (currentActivePaymentIdForQr) {
                openPaymentQrModal(currentActivePaymentIdForQr);
            }
        });
    }

    const paymentMethodSelect = document.getElementById("paymentMethodSelect");
    if (paymentMethodSelect) {
        paymentMethodSelect.addEventListener("change", () => {
            const upiSec = document.getElementById("paymentUpiSection");
            const cardSec = document.getElementById("paymentCardSection");
            const netBankSec = document.getElementById("paymentNetBankingSection");
            const val = paymentMethodSelect.value;

            if (upiSec) upiSec.style.display = val === "UPI" ? "block" : "none";
            if (cardSec) cardSec.style.display = (val === "Credit Card" || val === "Debit Card") ? "block" : "none";
            if (netBankSec) netBankSec.style.display = val === "Net Banking" ? "block" : "none";
        });
    }
}

async function loadPaymentStats() {
    try {
        const response = await fetch("/api/payments/stats");
        if (!response.ok) throw new Error("Failed to load payment stats");
        const data = await response.json();

        const totalEl = document.getElementById("totalPaymentsCount");
        const revenueEl = document.getElementById("totalCollectedRevenue");
        const pendingEl = document.getElementById("pendingPaymentsCount");
        const refundedEl = document.getElementById("refundedPaymentsCount");

        if (totalEl) totalEl.textContent = data.total_payments;
        if (revenueEl) revenueEl.textContent = `₹${data.total_collected.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (pendingEl) pendingEl.textContent = data.pending_payments;
        if (refundedEl) refundedEl.textContent = data.refunded_payments;
    } catch (error) {
        console.error("Payment stats error:", error);
    }
}

async function loadPaymentsTable() {
    const tableBody = document.getElementById("paymentsTableBody");
    if (!tableBody) return;

    const searchInput = document.getElementById("paymentsSearchInput");
    const statusFilter = document.getElementById("paymentStatusFilter");
    const methodFilter = document.getElementById("paymentMethodFilter");

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append("search", searchInput.value.trim());
    if (statusFilter && statusFilter.value) params.append("status", statusFilter.value);
    if (methodFilter && methodFilter.value) params.append("method", methodFilter.value);

    try {
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Loading payments...</td></tr>`;

        const response = await fetch(`/api/payments?${params.toString()}`);
        if (!response.ok) throw new Error("Could not load payments");
        const payments = await response.json();

        if (!payments || payments.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No payment records found</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        payments.forEach(py => {
            const tr = document.createElement("tr");

            let statusBadgeClass = "status-pending";
            if (py.payment_status === "Paid") statusBadgeClass = "status-delivered";
            else if (py.payment_status === "Refunded") statusBadgeClass = "status-out";

            tr.innerHTML = `
                <td><strong>#PAY-${py.payment_id}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #f2f4f7;">${escapeHtml(py.tracking_number)}</div>
                    <small style="color: #808ea3;">${escapeHtml(py.origin_city)} → ${escapeHtml(py.destination_city)}</small>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(py.customer_name)}</div>
                    <small style="color: #808ea3;">${escapeHtml(py.customer_phone)}</small>
                </td>
                <td><strong style="color: #4ade80;">₹${Number(py.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                <td><span style="font-size: 13px; color: #cbd5e1;">${escapeHtml(py.payment_method)}</span></td>
                <td>
                    <span class="status-badge ${statusBadgeClass}">
                        ${escapeHtml(py.payment_status)}
                    </span>
                </td>
                <td><span style="font-size: 13px; color: #94a3b8;">${escapeHtml(py.payment_date || 'Pending')}</span></td>
                <td style="text-align: right;">
                    <div style="display: inline-flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="ghost-button" onclick="viewPaymentDetails(${py.payment_id})" title="View Payment Details">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button type="button" class="ghost-button" onclick="openPaymentQrModal(${py.payment_id})" title="Generate Payment QR Code" style="color: #60a5fa;">
                            <i class="fa-solid fa-qrcode"></i>
                        </button>
                        ${py.payment_status === "Unpaid" ? `
                        <button type="button" class="ghost-button" onclick="updatePaymentStatus(${py.payment_id}, 'Paid')" title="Mark as Paid" style="color: #4ade80;">
                            <i class="fa-solid fa-circle-check"></i>
                        </button>` : ''}
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Error loading payments table:", error);
        tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: #f87171;">Failed to load payments.</td></tr>`;
    }
}

async function openCreatePaymentModal() {
    const modal = document.getElementById("paymentModal");
    const parcelSelect = document.getElementById("paymentParcelSelect");
    const customerDisplay = document.getElementById("paymentCustomerDisplay");
    const amountInput = document.getElementById("paymentAmountInput");
    const messageEl = document.getElementById("paymentFormMessage");

    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }

    if (customerDisplay) customerDisplay.value = "";
    if (amountInput) amountInput.value = "";

    try {
        if (parcelSelect) {
            parcelSelect.innerHTML = `<option value="">Loading unpaid parcels...</option>`;
            const res = await fetch("/api/payments/unpaid-parcels");
            if (!res.ok) throw new Error("Could not load parcels");
            const unpaidParcels = await res.json();

            if (!unpaidParcels || unpaidParcels.length === 0) {
                parcelSelect.innerHTML = `<option value="">All parcels currently have invoices recorded</option>`;
            } else {
                parcelSelect.innerHTML = `<option value="">Select an unpaid parcel...</option>`;
                unpaidParcels.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.parcel_id;
                    opt.dataset.customer = `${p.customer_name} (${p.customer_email || 'No email'})`;
                    opt.dataset.cost = p.shipping_cost;
                    opt.textContent = `${p.tracking_number} — ₹${Number(p.shipping_cost).toFixed(2)} (${p.customer_name})`;
                    parcelSelect.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Error loading unpaid parcels:", e);
    }

    const paymentMethodSelect = document.getElementById("paymentMethodSelect");
    if (paymentMethodSelect) {
        paymentMethodSelect.value = "UPI";
        paymentMethodSelect.dispatchEvent(new Event("change"));
    }

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closePaymentModal() {
    const modal = document.getElementById("paymentModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function handlePaymentFormSubmit(e) {
    e.preventDefault();
    const parcelSelect = document.getElementById("paymentParcelSelect");
    const amountInput = document.getElementById("paymentAmountInput");
    const methodSelect = document.getElementById("paymentMethodSelect");
    const statusSelect = document.getElementById("paymentStatusSelect");
    const messageEl = document.getElementById("paymentFormMessage");
    const submitBtn = document.getElementById("submitPaymentButton");

    const payload = {
        parcel_id: parseInt(parcelSelect.value, 10),
        amount: parseFloat(amountInput.value),
        payment_method: methodSelect.value,
        payment_status: statusSelect.value
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Recording...</span>`;
        }

        const response = await fetch("/api/payments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to record payment.");
        }

        closePaymentModal();
        showToast("Payment Recorded", `Invoice #PAY-${result.payment_id} recorded in MySQL.`);
        loadPaymentStats();
        loadPaymentsTable();
        loadDashboard();
        loadAlerts();
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message;
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Save Payment</span>`;
        }
    }
}

async function viewPaymentDetails(paymentId) {
    currentActivePaymentIdForQr = paymentId;
    const modal = document.getElementById("paymentDetailsModal");
    const titleEl = document.getElementById("detailPaymentTitle");
    const metaEl = document.getElementById("detailPaymentMeta");
    const statusEl = document.getElementById("detailPaymentStatus");
    const amountEl = document.getElementById("detailPaymentAmount");
    const methodEl = document.getElementById("detailPaymentMethod");
    const dateEl = document.getElementById("detailPaymentDate");
    const trackingEl = document.getElementById("detailPaymentTracking");
    const customerEl = document.getElementById("detailPaymentCustomer");
    const routeEl = document.getElementById("detailPaymentRoute");

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    try {
        if (titleEl) titleEl.textContent = "Loading transaction...";
        const response = await fetch(`/api/payments/${paymentId}`);
        if (!response.ok) throw new Error("Could not load payment details");
        const py = await response.json();

        if (titleEl) titleEl.textContent = `Payment #PAY-${py.payment_id}`;
        if (metaEl) metaEl.textContent = `Invoice Ref: CX-PAY-${String(py.payment_id).padStart(5, '0')} • Tracking: ${py.tracking_number}`;

        if (statusEl) {
            let statusBadgeClass = "status-pending";
            if (py.payment_status === "Paid") statusBadgeClass = "status-delivered";
            else if (py.payment_status === "Refunded") statusBadgeClass = "status-out";
            statusEl.innerHTML = `<span class="status-badge ${statusBadgeClass}">${escapeHtml(py.payment_status)}</span>`;
        }

        if (amountEl) amountEl.textContent = `₹${Number(py.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (methodEl) methodEl.textContent = py.payment_method;
        if (dateEl) dateEl.textContent = py.payment_date || "Pending (Not Settled)";
        if (trackingEl) trackingEl.innerHTML = `<strong>${escapeHtml(py.tracking_number)}</strong> <small style="display: block; color: #808ea3;">${escapeHtml(py.parcel_type)} • ${py.weight} kg</small>`;
        if (customerEl) customerEl.innerHTML = `<div>${escapeHtml(py.customer_name)}</div><small style="color: #808ea3;">${escapeHtml(py.customer_email || 'No email')} • ${escapeHtml(py.customer_phone)}</small>`;
        if (routeEl) routeEl.textContent = `${py.origin_branch} (${py.origin_city}) → ${py.destination_branch} (${py.destination_city})`;
    } catch (e) {
        console.error("Error loading payment details:", e);
        showToast("Error", "Could not load payment transaction details.");
    }
}

function closePaymentDetailsModal() {
    const modal = document.getElementById("paymentDetailsModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function updatePaymentStatus(paymentId, newStatus) {
    try {
        const response = await fetch(`/api/payments/${paymentId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to update status");

        showToast("Payment Updated", `Payment marked as ${newStatus}.`);
        loadPaymentStats();
        loadPaymentsTable();
    } catch (error) {
        console.error("Status update error:", error);
        showToast("Error", error.message);
    }
}


// =========================================================
// PAYMENT QR CODE GENERATION & DOWNLOAD
// =========================================================

let currentQrSvgContent = "";
let currentQrReference = "";

function setupPaymentQrModal() {
    const closeBtn = document.getElementById("closePaymentQrModal");
    const dismissBtn = document.getElementById("dismissPaymentQrButton");
    const downloadBtn = document.getElementById("downloadQrButton");

    if (closeBtn) closeBtn.addEventListener("click", closePaymentQrModal);
    if (dismissBtn) dismissBtn.addEventListener("click", closePaymentQrModal);
    if (downloadBtn) downloadBtn.addEventListener("click", downloadPaymentQr);
}

async function openPaymentQrModal(paymentId) {
    const modal = document.getElementById("paymentQrModal");
    const qrContainer = document.getElementById("paymentQrContainer");
    const refEl = document.getElementById("qrRefCode");
    const amountEl = document.getElementById("qrAmountDisplay");
    const trackingEl = document.getElementById("qrTrackingDisplay");
    const statusEl = document.getElementById("qrStatusDisplay");

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    if (qrContainer) {
        qrContainer.innerHTML = `
            <div id="qrLoadingSpinner" style="color: #64748b; font-size: 14px; text-align: center; padding: 20px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 26px; display: block; margin-bottom: 10px; color: #3b82f6;"></i>
                Generating dynamic QR code from database...
            </div>
        `;
    }

    try {
        const response = await fetch(`/api/payments/${paymentId}/qr`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Failed to generate QR code.");
        }

        const data = await response.json();
        currentQrSvgContent = data.qr_svg;
        currentQrReference = data.reference;

        if (refEl) refEl.textContent = data.reference;
        if (amountEl) amountEl.textContent = `₹${Number(data.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        if (trackingEl) trackingEl.textContent = data.tracking_number;
        if (statusEl) {
            statusEl.textContent = data.payment_status;
            statusEl.className = `status-badge ${data.payment_status === 'Paid' ? 'status-delivered' : (data.payment_status === 'Refunded' ? 'status-out' : 'status-pending')}`;
        }

        if (qrContainer) {
            qrContainer.innerHTML = data.qr_svg;
            const svgEl = qrContainer.querySelector("svg");
            if (svgEl) {
                svgEl.style.width = "100%";
                svgEl.style.height = "auto";
                svgEl.style.maxWidth = "240px";
                svgEl.style.display = "block";
            }
        }
    } catch (error) {
        console.error("QR Generation error:", error);
        if (qrContainer) {
            qrContainer.innerHTML = `
                <div style="color: #ef4444; font-size: 13px; text-align: center; padding: 15px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    ${escapeHtml(error.message)}
                </div>
            `;
        }
    }
}

function closePaymentQrModal() {
    const modal = document.getElementById("paymentQrModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

function downloadPaymentQr() {
    if (!currentQrSvgContent) {
        showToast("Download Unavailable", "No QR code available to download.", "error");
        return;
    }

    try {
        const blob = new Blob([currentQrSvgContent], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CourierX_Payment_${currentQrReference || 'QR'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("QR Downloaded", `Saved CourierX_Payment_${currentQrReference || 'QR'}.svg`);
    } catch (e) {
        console.error("Failed to download QR code:", e);
        showToast("Error", "Could not download QR code.");
    }
}


// =========================================================
// FEEDBACK MANAGEMENT
// =========================================================

let feedbackSearchDebounceTimer = null;

function setupFeedbackView() {
    const searchInput = document.getElementById("feedbackSearchInput");
    const ratingFilter = document.getElementById("feedbackRatingFilter");
    const resetBtn = document.getElementById("resetFeedbackFilters");
    const refreshBtn = document.getElementById("refreshFeedbackButton");
    const newBtn = document.getElementById("newFeedbackButton");
    const closeBtn = document.getElementById("closeFeedbackModal");
    const cancelBtn = document.getElementById("cancelFeedbackModal");
    const form = document.getElementById("feedbackForm");
    const parcelSelect = document.getElementById("feedbackParcelSelect");
    const closeDetailsBtn = document.getElementById("closeFeedbackDetailsModal");
    const dismissDetailsBtn = document.getElementById("dismissFeedbackDetailsButton");
    const starPicker = document.getElementById("starRatingPicker");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(feedbackSearchDebounceTimer);
            feedbackSearchDebounceTimer = setTimeout(() => {
                loadFeedbackTable();
            }, 300);
        });
    }

    if (ratingFilter) ratingFilter.addEventListener("change", () => loadFeedbackTable());

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) searchInput.value = "";
            if (ratingFilter) ratingFilter.value = "";
            loadFeedbackTable();
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadFeedbackStats();
            loadFeedbackTable();
            showToast("Feedback Refreshed", "Customer reviews reloaded.");
        });
    }

    if (newBtn) newBtn.addEventListener("click", openSubmitFeedbackModal);
    if (closeBtn) closeBtn.addEventListener("click", closeFeedbackModal);
    if (cancelBtn) cancelBtn.addEventListener("click", closeFeedbackModal);
    if (form) form.addEventListener("submit", handleFeedbackFormSubmit);

    if (parcelSelect) {
        parcelSelect.addEventListener("change", () => {
            const selectedOpt = parcelSelect.options[parcelSelect.selectedIndex];
            const customerDisplay = document.getElementById("feedbackCustomerDisplay");
            if (selectedOpt && selectedOpt.dataset.customer) {
                if (customerDisplay) customerDisplay.value = selectedOpt.dataset.customer;
            } else {
                if (customerDisplay) customerDisplay.value = "";
            }
        });
    }

    if (starPicker) {
        starPicker.querySelectorAll(".star-item").forEach(star => {
            star.addEventListener("click", () => {
                const rating = parseInt(star.dataset.rating, 10);
                setStarRating(rating);
            });
            star.addEventListener("mouseenter", () => {
                const rating = parseInt(star.dataset.rating, 10);
                highlightStars(rating);
            });
        });
        starPicker.addEventListener("mouseleave", () => {
            const currentRating = parseInt(document.getElementById("feedbackRatingInput").value || "5", 10);
            highlightStars(currentRating);
        });
    }

    if (closeDetailsBtn) closeDetailsBtn.addEventListener("click", closeFeedbackDetailsModal);
    if (dismissDetailsBtn) dismissDetailsBtn.addEventListener("click", closeFeedbackDetailsModal);
}

function setStarRating(rating) {
    const input = document.getElementById("feedbackRatingInput");
    const label = document.getElementById("starRatingLabel");
    if (input) input.value = rating;

    const descriptions = {
        1: "1 Star — Critical / Unsatisfactory",
        2: "2 Stars — Below Expectations",
        3: "3 Stars — Average Service",
        4: "4 Stars — Good / Prompt",
        5: "5 Stars — Excellent Experience"
    };

    if (label) label.textContent = descriptions[rating] || `${rating} Stars`;
    highlightStars(rating);
}

function highlightStars(rating) {
    const starPicker = document.getElementById("starRatingPicker");
    if (!starPicker) return;
    starPicker.querySelectorAll(".star-item").forEach(s => {
        const r = parseInt(s.dataset.rating, 10);
        if (r <= rating) {
            s.style.color = "#fbbf24";
        } else {
            s.style.color = "#334155";
        }
    });
}

async function loadFeedbackStats() {
    try {
        const response = await fetch("/api/feedback/stats");
        if (!response.ok) throw new Error("Failed to load feedback stats");
        const data = await response.json();

        const totalEl = document.getElementById("totalFeedbackCount");
        const avgEl = document.getElementById("avgFeedbackRating");
        const fiveEl = document.getElementById("fiveStarFeedbackCount");
        const oneEl = document.getElementById("oneStarFeedbackCount");

        if (totalEl) totalEl.textContent = data.total_feedback;
        if (avgEl) avgEl.innerHTML = `${data.average_rating} <span style="font-size: 16px; color: #fbbf24;">★</span>`;
        if (fiveEl) fiveEl.textContent = data.distribution ? (data.distribution["5"] || 0) : 0;
        if (oneEl) oneEl.textContent = data.distribution ? (data.distribution["1"] || 0) : 0;
    } catch (e) {
        console.error("Feedback stats error:", e);
    }
}

async function loadFeedbackTable() {
    const tableBody = document.getElementById("feedbackTableBody");
    if (!tableBody) return;

    const searchInput = document.getElementById("feedbackSearchInput");
    const ratingFilter = document.getElementById("feedbackRatingFilter");

    const params = new URLSearchParams();
    if (searchInput && searchInput.value.trim()) params.append("search", searchInput.value.trim());
    if (ratingFilter && ratingFilter.value) params.append("rating", ratingFilter.value);

    try {
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>Loading feedback...</td></tr>`;

        const response = await fetch(`/api/feedback?${params.toString()}`);
        if (!response.ok) throw new Error("Could not load feedback");
        const feedbackList = await response.json();

        if (!feedbackList || feedbackList.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No feedback records found</td></tr>`;
            return;
        }

        tableBody.innerHTML = "";
        feedbackList.forEach(fb => {
            const tr = document.createElement("tr");

            let starsHtml = "";
            for (let i = 1; i <= 5; i++) {
                if (i <= fb.rating) {
                    starsHtml += `<i class="fa-solid fa-star" style="color: #fbbf24; margin-right: 2px;"></i>`;
                } else {
                    starsHtml += `<i class="fa-regular fa-star" style="color: #475569; margin-right: 2px;"></i>`;
                }
            }

            const commentSnippet = fb.comments ? (fb.comments.length > 55 ? fb.comments.substring(0, 55) + "..." : fb.comments) : "<em style='color: #64748b;'>No written comment</em>";

            tr.innerHTML = `
                <td><strong>#REV-${fb.feedback_id}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #f2f4f7;">${escapeHtml(fb.tracking_number)}</div>
                    <small style="color: #808ea3;">${escapeHtml(fb.parcel_status)}</small>
                </td>
                <td>
                    <div style="font-weight: 600;">${escapeHtml(fb.customer_name)}</div>
                    <small style="color: #808ea3;">${escapeHtml(fb.customer_email || fb.customer_phone)}</small>
                </td>
                <td>
                    <div style="display: inline-flex; align-items: center;" title="${fb.rating} of 5 stars">
                        ${starsHtml}
                        <strong style="margin-left: 6px; font-size: 13px; color: #fbbf24;">${fb.rating}.0</strong>
                    </div>
                </td>
                <td style="max-width: 280px; color: #cbd5e1; font-size: 13px;">${escapeHtml(commentSnippet)}</td>
                <td><span style="font-size: 13px; color: #94a3b8;">${escapeHtml(fb.feedback_date)}</span></td>
                <td style="text-align: right;">
                    <button type="button" class="ghost-button" onclick="viewFeedbackDetails(${fb.feedback_id})" title="View Complete Feedback">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error loading feedback:", e);
        tableBody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color: #f87171;">Failed to load feedback.</td></tr>`;
    }
}

async function openSubmitFeedbackModal() {
    const modal = document.getElementById("feedbackModal");
    const parcelSelect = document.getElementById("feedbackParcelSelect");
    const customerDisplay = document.getElementById("feedbackCustomerDisplay");
    const commentsInput = document.getElementById("feedbackCommentsInput");
    const messageEl = document.getElementById("feedbackFormMessage");

    if (messageEl) {
        messageEl.textContent = "";
        messageEl.className = "form-message";
    }

    if (customerDisplay) customerDisplay.value = "";
    if (commentsInput) commentsInput.value = "";
    setStarRating(5);

    try {
        if (parcelSelect) {
            parcelSelect.innerHTML = `<option value="">Loading eligible parcels...</option>`;
            const res = await fetch("/api/feedback/eligible-parcels");
            if (!res.ok) throw new Error("Could not load eligible parcels");
            const eligible = await res.json();

            if (!eligible || eligible.length === 0) {
                parcelSelect.innerHTML = `<option value="">All active parcels have already received customer feedback</option>`;
            } else {
                parcelSelect.innerHTML = `<option value="">Choose a parcel to review...</option>`;
                eligible.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.parcel_id;
                    opt.dataset.customer = `${p.customer_name} (Sender)`;
                    opt.textContent = `${p.tracking_number} — ${p.parcel_type} (${p.customer_name})`;
                    parcelSelect.appendChild(opt);
                });
            }
        }
    } catch (e) {
        console.error("Error loading eligible parcels for feedback:", e);
    }

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById("feedbackModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}

async function handleFeedbackFormSubmit(e) {
    e.preventDefault();
    const parcelSelect = document.getElementById("feedbackParcelSelect");
    const ratingInput = document.getElementById("feedbackRatingInput");
    const commentsInput = document.getElementById("feedbackCommentsInput");
    const messageEl = document.getElementById("feedbackFormMessage");
    const submitBtn = document.getElementById("submitFeedbackButton");

    const payload = {
        parcel_id: parseInt(parcelSelect.value, 10),
        rating: parseInt(ratingInput.value, 10),
        comments: commentsInput.value.trim()
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Submitting...</span>`;
        }

        const endpoint = (window.currentUser && window.currentUser.role === "Courier Partner")
            ? "/api/feedback/courier-review"
            : "/api/feedback";

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to submit feedback.");
        }

        closeFeedbackModal();
        showToast("Feedback Submitted", "Thank you! Customer review recorded successfully.");
        loadFeedbackStats();
        loadFeedbackTable();
        loadDashboard();
        loadAlerts();
    } catch (error) {
        if (messageEl) {
            messageEl.textContent = error.message;
            messageEl.className = "form-message error";
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-check"></i><span>Submit Feedback</span>`;
        }
    }
}

async function viewFeedbackDetails(feedbackId) {
    const modal = document.getElementById("feedbackDetailsModal");
    const titleEl = document.getElementById("detailFeedbackTitle");
    const metaEl = document.getElementById("detailFeedbackMeta");
    const ratingEl = document.getElementById("detailFeedbackRating");
    const parcelEl = document.getElementById("detailFeedbackParcel");
    const customerEl = document.getElementById("detailFeedbackCustomer");
    const dateEl = document.getElementById("detailFeedbackDate");
    const commentsEl = document.getElementById("detailFeedbackComments");

    if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    try {
        if (titleEl) titleEl.textContent = "Loading review...";
        const response = await fetch(`/api/feedback/${feedbackId}`);
        if (!response.ok) throw new Error("Could not load feedback details");
        const fb = await response.json();

        if (titleEl) titleEl.textContent = `Feedback Review #REV-${fb.feedback_id}`;
        if (metaEl) metaEl.textContent = `Tracking Number: ${fb.tracking_number} • Submitted on ${fb.feedback_date}`;

        let starsHtml = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= fb.rating) {
                starsHtml += `<i class="fa-solid fa-star" style="color: #fbbf24; margin-right: 3px;"></i>`;
            } else {
                starsHtml += `<i class="fa-regular fa-star" style="color: #475569; margin-right: 3px;"></i>`;
            }
        }
        if (ratingEl) ratingEl.innerHTML = `${starsHtml} <span style="font-size: 16px; font-weight: 700; margin-left: 6px;">${fb.rating} / 5</span>`;

        if (parcelEl) parcelEl.innerHTML = `<strong>${escapeHtml(fb.tracking_number)}</strong><small style="display: block; color: #808ea3;">${escapeHtml(fb.parcel_type)} • Status: ${escapeHtml(fb.parcel_status)}</small>`;
        if (customerEl) customerEl.innerHTML = `<div>${escapeHtml(fb.customer_name)}</div><small style="color: #808ea3;">${escapeHtml(fb.customer_email || 'No email')} • ${escapeHtml(fb.customer_phone)}</small>`;
        if (dateEl) dateEl.textContent = fb.feedback_date;
        if (commentsEl) commentsEl.textContent = fb.comments || "No written remarks were provided with this rating.";
    } catch (e) {
        console.error("Error loading feedback details:", e);
        showToast("Error", "Could not load feedback review.");
    }
}

function closeFeedbackDetailsModal() {
    const modal = document.getElementById("feedbackDetailsModal");
    if (modal) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


// =========================================================
// COURIERX AUTHENTICATION PORTAL & SESSION MANAGEMENT
// =========================================================

function setupAuthPortal() {
    // 1. Role Selection Cards
    const roleCardCustomer = document.getElementById("roleCardCustomer");
    const roleCardCourier = document.getElementById("roleCardCourier");
    const roleCardVendor = document.getElementById("roleCardVendor");
    const roleCardAdmin = document.getElementById("roleCardAdmin");

    if (roleCardCustomer) roleCardCustomer.addEventListener("click", () => selectRoleForAuth("Customer"));
    if (roleCardCourier) roleCardCourier.addEventListener("click", () => selectRoleForAuth("Courier Partner"));
    if (roleCardVendor) roleCardVendor.addEventListener("click", () => selectRoleForAuth("Seller/Vendor"));
    if (roleCardAdmin) roleCardAdmin.addEventListener("click", () => selectRoleForAuth("Administrator"));

    // 2. Back Navigation
    const backBtn = document.getElementById("authBackToRoles");
    if (backBtn) backBtn.addEventListener("click", backToRoleSelection);

    // 3. Form Tabs
    const tabLogin = document.getElementById("tabAuthLogin");
    const tabRegister = document.getElementById("tabAuthRegister");
    if (tabLogin) tabLogin.addEventListener("click", () => switchAuthTab("login"));
    if (tabRegister) tabRegister.addEventListener("click", () => switchAuthTab("register"));

    // 4. Password Toggles
    const toggleLoginPw = document.getElementById("toggleLoginPassword");
    if (toggleLoginPw) {
        toggleLoginPw.addEventListener("click", () => {
            const pw = document.getElementById("loginPassword");
            if (pw) {
                const isPw = pw.type === "password";
                pw.type = isPw ? "text" : "password";
                toggleLoginPw.innerHTML = isPw ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
            }
        });
    }

    const toggleRegPw = document.getElementById("toggleRegPassword");
    if (toggleRegPw) {
        toggleRegPw.addEventListener("click", () => {
            const pw = document.getElementById("regPassword");
            const pwConf = document.getElementById("regConfirmPassword");
            if (pw) {
                const isPw = pw.type === "password";
                pw.type = isPw ? "text" : "password";
                if (pwConf) pwConf.type = isPw ? "text" : "password";
                toggleRegPw.innerHTML = isPw ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
            }
        });
    }

    // 5. Form Submissions
    const formLogin = document.getElementById("formLogin");
    if (formLogin) formLogin.addEventListener("submit", handleLoginSubmit);

    const formRegister = document.getElementById("formRegister");
    if (formRegister) formRegister.addEventListener("submit", handleRegisterSubmit);

    // 6. Sign Out
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

    // 7. Clickable default admin autofill
    const demoAdminHint = document.getElementById("demoAdminHint");
    if (demoAdminHint) {
        demoAdminHint.addEventListener("click", () => {
            const emailInput = document.getElementById("loginEmail");
            const passwordInput = document.getElementById("loginPassword");
            if (emailInput) emailInput.value = "admin@courierx.com";
            if (passwordInput) passwordInput.value = "Admin@CourierX2026!";
            showToast("Credentials Populated", "Default admin login & password filled.");
        });
    }
}


async function checkAuthSession() {
    try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
            showAuthOverlay();
            return;
        }

        const data = await response.json();
        if (data.authenticated && data.user) {
            onAuthSuccess(data.user);
        } else {
            showAuthOverlay();
        }
    } catch (err) {
        console.error("Auth session check error:", err);
        showAuthOverlay();
    }
}


function showAuthOverlay() {
    const overlay = document.getElementById("authOverlay");
    if (overlay) {
        overlay.classList.remove("hidden");
    }
    backToRoleSelection();
}


function hideAuthOverlay() {
    const overlay = document.getElementById("authOverlay");
    if (overlay) {
        overlay.classList.add("hidden");
    }
}


function selectRoleForAuth(role) {
    window.selectedAuthRole = role;

    const roleSelection = document.getElementById("authRoleSelection");
    const formContainer = document.getElementById("authFormContainer");
    const titleEl = document.getElementById("authFormRoleTitle");
    const badgeEl = document.getElementById("authFormRoleBadge");
    const tabRegister = document.getElementById("tabAuthRegister");
    const demoHint = document.getElementById("demoAdminHint");
    const regBranchGroup = document.getElementById("regBranchGroup");
    const regBusinessGroup = document.getElementById("regBusinessGroup");
    const regAddressGroup = document.getElementById("regAddressGroup");
    const regNameLabel = document.getElementById("regNameLabel");
    const regAddressLabel = document.getElementById("regAddressLabel");

    clearAuthBanners();

    if (roleSelection) roleSelection.style.display = "none";
    if (formContainer) formContainer.style.display = "block";

    const titles = {
        "Customer": "Customer Portal",
        "Courier Partner": "Courier Partner Portal",
        "Seller/Vendor": "Seller / Vendor Portal",
        "Administrator": "System Administrator"
    };

    if (titleEl) titleEl.textContent = titles[role] || `${role} Portal`;

    if (badgeEl) {
        badgeEl.className = `status-badge ${getRoleBadgeClass(role)}`;
        badgeEl.textContent = role;
    }

    if (role === "Administrator") {
        if (tabRegister) tabRegister.style.display = "none";
        if (demoHint) demoHint.style.display = "block";
        switchAuthTab("login");
    } else {
        if (tabRegister) tabRegister.style.display = "inline-flex";
        if (demoHint) demoHint.style.display = "none";
        switchAuthTab("login");

        if (role === "Courier Partner") {
            if (regBranchGroup) regBranchGroup.style.display = "block";
            if (regBusinessGroup) regBusinessGroup.style.display = "none";
            if (regAddressGroup) regAddressGroup.style.display = "none";
            if (regNameLabel) regNameLabel.textContent = "Courier Full Name";
            loadBranchesForRegistration();
        } else if (role === "Seller/Vendor") {
            if (regBranchGroup) regBranchGroup.style.display = "none";
            if (regBusinessGroup) regBusinessGroup.style.display = "block";
            if (regAddressGroup) regAddressGroup.style.display = "block";
            if (regNameLabel) regNameLabel.textContent = "Authorized Representative Name";
            if (regAddressLabel) regAddressLabel.textContent = "Registered Warehouse / Hub Address";
        } else {
            // Customer
            if (regBranchGroup) regBranchGroup.style.display = "none";
            if (regBusinessGroup) regBusinessGroup.style.display = "none";
            if (regAddressGroup) regAddressGroup.style.display = "block";
            if (regNameLabel) regNameLabel.textContent = "Full Name";
            if (regAddressLabel) regAddressLabel.textContent = "Residential / Delivery Address";
        }
    }
}


function backToRoleSelection() {
    const roleSelection = document.getElementById("authRoleSelection");
    const formContainer = document.getElementById("authFormContainer");

    if (roleSelection) roleSelection.style.display = "block";
    if (formContainer) formContainer.style.display = "none";

    clearAuthBanners();
    resetAuthForms();
}


function switchAuthTab(tab) {
    const tabLogin = document.getElementById("tabAuthLogin");
    const tabRegister = document.getElementById("tabAuthRegister");
    const formLogin = document.getElementById("formLogin");
    const formRegister = document.getElementById("formRegister");
    const adminNotice = document.getElementById("adminRegisterNotice");

    clearAuthBanners();

    if (tab === "login") {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabRegister) tabRegister.classList.remove("active");
        if (formLogin) formLogin.style.display = "block";
        if (formRegister) formRegister.style.display = "none";
        if (adminNotice) adminNotice.style.display = "none";
    } else {
        if (tabLogin) tabLogin.classList.remove("active");
        if (tabRegister) tabRegister.classList.add("active");

        if (window.selectedAuthRole === "Administrator") {
            if (formLogin) formLogin.style.display = "none";
            if (formRegister) formRegister.style.display = "none";
            if (adminNotice) adminNotice.style.display = "block";
        } else {
            if (formLogin) formLogin.style.display = "none";
            if (formRegister) formRegister.style.display = "block";
            if (adminNotice) adminNotice.style.display = "none";
        }
    }
}


async function loadBranchesForRegistration() {
    const branchSelect = document.getElementById("regBranchId");
    if (!branchSelect) return;

    try {
        const response = await fetch("/api/branches?status=Active");
        if (!response.ok) return;

        const branches = await response.json();
        branchSelect.innerHTML = `<option value="">Select Home Operating Branch...</option>`;
        branches.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b.branch_id;
            opt.textContent = `${b.branch_name} (${b.city}, ${b.state})`;
            branchSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Error loading branches for registration:", e);
    }
}


async function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthBanners();

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const submitBtn = document.getElementById("submitLoginBtn");

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const role = window.selectedAuthRole;

    if (!email || !password) {
        showAuthError("Please provide both email and password.");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Signing In...</span>`;
        }

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Authentication failed. Please verify credentials.");
        }

        showToast("Signed In", `Welcome back, ${data.user.name}!`);
        resetAuthForms();
        onAuthSuccess(data.user);
    } catch (err) {
        showAuthError(err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i><span>Sign In to CourierX</span>`;
        }
    }
}


async function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthBanners();

    const role = window.selectedAuthRole;
    const nameInput = document.getElementById("regName");
    const emailInput = document.getElementById("regEmail");
    const phoneInput = document.getElementById("regPhone");
    const passwordInput = document.getElementById("regPassword");
    const confirmInput = document.getElementById("regConfirmPassword");
    const branchSelect = document.getElementById("regBranchId");
    const addressInput = document.getElementById("regAddress");
    const businessInput = document.getElementById("regBusinessName");
    const submitBtn = document.getElementById("submitRegisterBtn");

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmInput ? confirmInput.value : "";

    if (!name || !email || !phone || !password) {
        showAuthError("All required registration fields must be provided.");
        return;
    }

    if (password.length < 8) {
        showAuthError("Password must be at least 8 characters long.");
        return;
    }

    if (password !== confirmPassword) {
        showAuthError("Passwords do not match. Please re-enter.");
        return;
    }

    let endpoint = "";
    let payload = { name, email, phone, password, confirm_password: confirmPassword };

    if (role === "Customer") {
        endpoint = "/api/auth/register/customer";
        payload.address = addressInput ? addressInput.value.trim() : "";
    } else if (role === "Courier Partner") {
        endpoint = "/api/auth/register/courier";
        const branchId = branchSelect ? parseInt(branchSelect.value, 10) : 0;
        if (!branchId) {
            showAuthError("Please select a valid home operating branch.");
            return;
        }
        payload.branch_id = branchId;
    } else if (role === "Seller/Vendor") {
        endpoint = "/api/auth/register/vendor";
        payload.business_name = businessInput ? businessInput.value.trim() : "";
        payload.address = addressInput ? addressInput.value.trim() : "";
    } else {
        showAuthError("Self-registration is not permitted for administrative accounts.");
        return;
    }

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Registering Account...</span>`;
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Registration failed.");
        }

        if (role === "Customer") {
            showToast("Registration Complete", "Your customer account has been created and verified!");
            resetAuthForms();
            onAuthSuccess(data.user);
        } else {
            // Courier or Vendor -> Pending status
            showAuthSuccess("Application Submitted! Your registration is currently awaiting Administrator review. Once verified, you will be able to log in.");
            resetAuthForms();
            setTimeout(() => {
                switchAuthTab("login");
            }, 3500);
        }
    } catch (err) {
        showAuthError(err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-user-plus"></i><span>Complete Registration</span>`;
        }
    }
}


async function handleLogout() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
        console.error("Logout error:", e);
    } finally {
        window.currentUser = null;
        showToast("Signed Out", "You have been logged out of your session.");
        showAuthOverlay();
    }
}


function onAuthSuccess(user) {
    window.currentUser = user;
    hideAuthOverlay();

    // 1. Update Topbar User Profile
    const userNameEl = document.getElementById("topbarUserName");
    const userRoleEl = document.getElementById("topbarUserRole");
    const avatarEl = document.getElementById("topbarAvatar");

    if (userNameEl) userNameEl.textContent = user.name || user.email;
    if (userRoleEl) {
        userRoleEl.textContent = user.role;
        userRoleEl.className = `status-badge ${getRoleBadgeClass(user.role)}`;
    }
    if (avatarEl) avatarEl.textContent = getInitials(user.name || user.email);

    // 2. Adjust Sidebar Navigation & Action Buttons per Role
    applyRoleNavigation(user.role);

    // 3. Load Role-Specific Initial Data
    loadRoleInitialData(user);
}


function applyRoleNavigation(role) {
    const navDashboard = document.getElementById("navDashboard");
    const navParcels = document.getElementById("navParcels");
    const navShipments = document.getElementById("navShipments");
    const navTracking = document.getElementById("navTracking");
    const navCustomers = document.getElementById("navCustomers");
    const navBranches = document.getElementById("navBranches");
    const navEmployees = document.getElementById("navEmployees");
    const navVehicles = document.getElementById("navVehicles");
    const navUsers = document.getElementById("navUsers");
    const navPayments = document.getElementById("navPayments");
    const navFeedback = document.getElementById("navFeedback");

    const newParcelButton = document.getElementById("newParcelButton");
    const parcelsNewButton = document.getElementById("parcelsNewButton");
    const assignShipmentButton = document.getElementById("assignShipmentButton");
    const shipmentsAssignButton = document.getElementById("shipmentsAssignButton");

    // Helper to toggle visibility
    const setDisplay = (el, show, displayType = "flex") => {
        if (el) el.style.display = show ? displayType : "none";
    };

    // Sidebar Section Headers
    const navLabels = document.querySelectorAll(".sidebar-nav .nav-label");
    const mgmtLabel = navLabels.length >= 2 ? navLabels[1] : null;
    const financeLabel = navLabels.length >= 3 ? navLabels[2] : null;

    if (role === "Administrator") {
        setDisplay(navDashboard, true);
        setDisplay(navParcels, true);
        setDisplay(navShipments, true);
        setDisplay(navTracking, true);
        setDisplay(navCustomers, true);
        setDisplay(navBranches, true);
        setDisplay(navEmployees, true);
        setDisplay(navVehicles, true);
        setDisplay(navUsers, true);
        setDisplay(navPayments, true);
        setDisplay(navFeedback, true);

        if (mgmtLabel) mgmtLabel.style.display = "block";
        if (financeLabel) financeLabel.style.display = "block";

        setDisplay(newParcelButton, true, "inline-flex");
        setDisplay(parcelsNewButton, true, "inline-flex");
        setDisplay(assignShipmentButton, true, "inline-flex");
        setDisplay(shipmentsAssignButton, true, "inline-flex");

        if (navParcels) {
            const span = navParcels.querySelector("span");
            if (span) span.textContent = "Parcels";
        }
        if (navShipments) {
            const span = navShipments.querySelector("span");
            if (span) span.textContent = "Shipments";
        }
        if (navPayments) {
            const span = navPayments.querySelector("span");
            if (span) span.textContent = "Payments";
        }
        if (navFeedback) {
            const span = navFeedback.querySelector("span");
            if (span) span.textContent = "Feedback";
        }
    } else if (role === "Customer" || role === "Seller/Vendor") {
        setDisplay(navDashboard, true);
        setDisplay(navParcels, true);
        setDisplay(navShipments, false);
        setDisplay(navTracking, true);
        setDisplay(navCustomers, false);
        setDisplay(navBranches, false);
        setDisplay(navEmployees, false);
        setDisplay(navVehicles, false);
        setDisplay(navUsers, false);
        setDisplay(navPayments, true);
        setDisplay(navFeedback, true);

        if (mgmtLabel) mgmtLabel.style.display = "none";
        if (financeLabel) financeLabel.style.display = "block";

        setDisplay(newParcelButton, true, "inline-flex");
        setDisplay(parcelsNewButton, true, "inline-flex");
        setDisplay(assignShipmentButton, false);
        setDisplay(shipmentsAssignButton, false);

        if (navParcels) {
            const span = navParcels.querySelector("span");
            if (span) span.textContent = role === "Seller/Vendor" ? "Commercial Parcels" : "My Parcels";
        }
        if (navPayments) {
            const span = navPayments.querySelector("span");
            if (span) span.textContent = role === "Seller/Vendor" ? "Billing & Invoices" : "My Invoices";
        }
        if (navFeedback) {
            const span = navFeedback.querySelector("span");
            if (span) span.textContent = "My Reviews";
        }
    } else if (role === "Courier Partner") {
        setDisplay(navDashboard, true);
        setDisplay(navParcels, false);
        setDisplay(navShipments, true);
        setDisplay(navTracking, true);
        setDisplay(navCustomers, false);
        setDisplay(navBranches, false);
        setDisplay(navEmployees, false);
        setDisplay(navVehicles, false);
        setDisplay(navUsers, false);
        setDisplay(navPayments, false);
        setDisplay(navFeedback, true);

        if (mgmtLabel) mgmtLabel.style.display = "none";
        if (financeLabel) financeLabel.style.display = "none";

        setDisplay(newParcelButton, false);
        setDisplay(parcelsNewButton, false);
        setDisplay(assignShipmentButton, false);
        setDisplay(shipmentsAssignButton, false);

        if (navShipments) {
            const span = navShipments.querySelector("span");
            if (span) span.textContent = "My Assigned Shipments";
        }
        if (navFeedback) {
            const span = navFeedback.querySelector("span");
            if (span) span.textContent = "Delivery Reviews";
        }
    }
}


function loadRoleInitialData(user) {
    if (user.role === "Administrator") {
        loadDashboard();
        loadAlerts();
        loadBranches();
        loadCustomers();
        loadPendingUsersCount();
        switchToView("dashboard");
    } else if (user.role === "Customer" || user.role === "Seller/Vendor") {
        loadDashboard();
        loadBranches();
        switchToView("dashboard");
    } else if (user.role === "Courier Partner") {
        loadDashboard();
        switchToView("shipments");
        loadShipmentsTable();
    }
}


function prefillSenderForCustomer() {
    const user = window.currentUser;
    const nameInput = document.getElementById("senderName");
    const emailInput = document.getElementById("senderEmail");
    const phoneInput = document.getElementById("senderPhone");
    const addressInput = document.getElementById("senderAddress");

    if (user && (user.role === "Customer" || user.role === "Seller/Vendor")) {
        if (nameInput) {
            nameInput.value = user.name || "";
            nameInput.readOnly = true;
            nameInput.style.opacity = "0.75";
        }
        if (emailInput) {
            emailInput.value = user.email || "";
            emailInput.readOnly = true;
            emailInput.style.opacity = "0.75";
        }
        if (phoneInput) {
            phoneInput.value = user.phone || "";
            phoneInput.readOnly = true;
            phoneInput.style.opacity = "0.75";
        }
        if (addressInput) {
            addressInput.value = user.customer_address || "";
            addressInput.readOnly = true;
            addressInput.style.opacity = "0.75";
        }
    } else {
        if (nameInput) { nameInput.readOnly = false; nameInput.style.opacity = ""; }
        if (emailInput) { emailInput.readOnly = false; emailInput.style.opacity = ""; }
        if (phoneInput) { phoneInput.readOnly = false; phoneInput.style.opacity = ""; }
        if (addressInput) { addressInput.readOnly = false; addressInput.style.opacity = ""; }
    }
}


function showAuthError(msg) {
    const banner = document.getElementById("authErrorBanner");
    const text = document.getElementById("authErrorText");
    if (banner && text) {
        text.textContent = msg;
        banner.style.display = "flex";
    }
}


function showAuthSuccess(msg) {
    const banner = document.getElementById("authSuccessBanner");
    const text = document.getElementById("authSuccessText");
    if (banner && text) {
        text.textContent = msg;
        banner.style.display = "flex";
    }
}


function clearAuthBanners() {
    const err = document.getElementById("authErrorBanner");
    const succ = document.getElementById("authSuccessBanner");
    const info = document.getElementById("authInfoNote");
    if (err) err.style.display = "none";
    if (succ) succ.style.display = "none";
    if (info) info.style.display = "none";
}


function resetAuthForms() {
    const fl = document.getElementById("formLogin");
    const fr = document.getElementById("formRegister");
    if (fl) fl.reset();
    if (fr) fr.reset();
}


function getRoleBadgeClass(role) {
    if (role === "Administrator") return "badge-role-admin";
    if (role === "Courier Partner") return "badge-role-courier";
    if (role === "Seller/Vendor") return "badge-role-vendor";
    return "badge-role-customer";
}


function getInitials(name) {
    if (!name) return "CX";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


// =========================================================
// USERS & APPROVALS MANAGEMENT (ADMINISTRATOR)
// =========================================================

let usersSearchDebounceTimer = null;
let cachedTotalUsers = 0;
let cachedPendingUsers = 0;
let cachedActiveCouriers = 0;
let cachedActiveVendors = 0;

function setupUsersView() {
    const searchInput = document.getElementById("usersSearchInput");
    const roleFilter = document.getElementById("usersRoleFilter");
    const statusFilter = document.getElementById("usersStatusFilter");
    const refreshButton = document.getElementById("refreshUsersButton");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            clearTimeout(usersSearchDebounceTimer);
            usersSearchDebounceTimer = setTimeout(() => {
                loadUsersTable();
            }, 300);
        });
        searchInput.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                clearTimeout(usersSearchDebounceTimer);
                loadUsersTable();
            }
        });
    }

    if (roleFilter) {
        roleFilter.addEventListener("change", () => loadUsersTable());
    }

    if (statusFilter) {
        statusFilter.addEventListener("change", () => loadUsersTable());
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            loadUsersTable();
            showToast("Users Refreshed", "User accounts reloaded from database.");
        });
    }
}


async function loadUsersTable() {
    const tableBody = document.getElementById("usersTableBody");
    const searchInput = document.getElementById("usersSearchInput");
    const roleFilter = document.getElementById("usersRoleFilter");
    const statusFilter = document.getElementById("usersStatusFilter");

    if (!tableBody) return;

    const searchQuery = searchInput ? searchInput.value.trim() : "";
    const selectedRole = roleFilter ? roleFilter.value.trim() : "";
    const selectedStatus = statusFilter ? statusFilter.value.trim() : "";

    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedRole) params.append("role", selectedRole);
    if (selectedStatus) params.append("status", selectedStatus);

    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="empty-state">
                <i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i>
                Loading user accounts...
            </td>
        </tr>
    `;

    try {
        const url = `/api/admin/users${params.toString() ? `?${params.toString()}` : ""}`;
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">Access denied. Administrator privileges required.</td></tr>`;
                return;
            }
            throw new Error("Failed to load user accounts");
        }

        const users = await response.json();

        // Calculate and update metrics
        updateUserMetrics(users, !selectedRole && !selectedStatus && !searchQuery);

        renderUsersTable(users);
    } catch (error) {
        console.error("Error loading users:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state error-message">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 8px;"></i>
                    Failed to load user accounts. Please try refreshing.
                </td>
            </tr>
        `;
    }
}


function updateUserMetrics(users, isUnfiltered) {
    if (isUnfiltered) {
        cachedTotalUsers = users.length;
        cachedPendingUsers = users.filter(u => u.status === "Pending").length;
        cachedActiveCouriers = users.filter(u => u.role === "Courier Partner" && u.status === "Active").length;
        cachedActiveVendors = users.filter(u => u.role === "Seller/Vendor" && u.status === "Active").length;
    }

    const totalEl = document.getElementById("metricTotalUsers");
    const pendingEl = document.getElementById("metricPendingUsers");
    const couriersEl = document.getElementById("metricActiveCouriers");
    const vendorsEl = document.getElementById("metricActiveVendors");
    const pendingBadge = document.getElementById("pendingUsersBadge");

    if (totalEl) totalEl.textContent = cachedTotalUsers;
    if (pendingEl) pendingEl.textContent = cachedPendingUsers;
    if (couriersEl) couriersEl.textContent = cachedActiveCouriers;
    if (vendorsEl) vendorsEl.textContent = cachedActiveVendors;

    if (pendingBadge) {
        if (cachedPendingUsers > 0) {
            pendingBadge.textContent = cachedPendingUsers;
            pendingBadge.style.display = "inline-flex";
        } else {
            pendingBadge.style.display = "none";
        }
    }
}


async function loadPendingUsersCount() {
    try {
        const res = await fetch("/api/admin/users?status=Pending");
        if (!res.ok) return;
        const pendingUsers = await res.json();
        const pendingBadge = document.getElementById("pendingUsersBadge");
        if (pendingBadge) {
            if (pendingUsers.length > 0) {
                pendingBadge.textContent = pendingUsers.length;
                pendingBadge.style.display = "inline-flex";
            } else {
                pendingBadge.style.display = "none";
            }
        }
    } catch (e) {
        // Silently ignore for non-admins
    }
}


function renderUsersTable(users) {
    const tableBody = document.getElementById("usersTableBody");
    if (!tableBody) return;

    if (!users || users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div style="padding: 24px 0; text-align: center;">
                        <i class="fa-solid fa-users-slash" style="font-size: 32px; color: #475569; margin-bottom: 12px; display: block;"></i>
                        <strong style="color: #cbd5e1; font-size: 15px; display: block; margin-bottom: 4px;">No user accounts found</strong>
                        <span style="color: #64748b; font-size: 13px;">No accounts match your current search or filter criteria.</span>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = users.map(u => {
        const roleBadge = getRoleBadgeHtml(u.role);
        const statusBadge = getUserStatusBadgeHtml(u.status);

        let linkedEntity = "—";
        if (u.role === "Courier Partner") {
            linkedEntity = `<span style="font-size: 12px; color: #38bdf8;"><i class="fa-solid fa-building" style="margin-right: 4px;"></i>${escapeHtml(u.branch_name || 'Unassigned')}</span>`;
            if (u.employee_id) {
                linkedEntity += `<small style="display:block; color:#64748b; font-family: monospace;">#EMP-${u.employee_id}</small>`;
            }
        } else if (u.role === "Customer" || u.role === "Seller/Vendor") {
            linkedEntity = `<span style="font-size: 12px; color: #94a3b8;"><i class="fa-solid fa-id-card" style="margin-right: 4px;"></i>#CUST-${u.customer_id || 'N/A'}</span>`;
            if (u.customer_address) {
                linkedEntity += `<small style="display:block; color:#64748b; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(u.customer_address)}</small>`;
            }
        } else if (u.role === "Administrator") {
            linkedEntity = `<span style="font-size: 12px; color: #10b981;"><i class="fa-solid fa-shield" style="margin-right: 4px;"></i>System Root</span>`;
        }

        let actionButtons = "";
        const isSelf = window.currentUser && window.currentUser.user_id === u.user_id;

        if (u.status === "Pending") {
            actionButtons = `
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button type="button" class="action-btn action-btn-activate btn-user-action" data-user-id="${u.user_id}" data-action="Active" title="Approve Application">
                        <i class="fa-solid fa-check"></i>
                        <span>Approve</span>
                    </button>
                    <button type="button" class="action-btn action-btn-delete btn-user-action" data-user-id="${u.user_id}" data-action="Rejected" title="Reject Application">
                        <i class="fa-solid fa-xmark"></i>
                        <span>Reject</span>
                    </button>
                </div>
            `;
        } else if (u.status === "Active") {
            if (isSelf) {
                actionButtons = `<span style="color: #60a5fa; font-size: 12px; font-weight: 600;"><i class="fa-solid fa-user-check"></i> Current User</span>`;
            } else {
                actionButtons = `
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button type="button" class="action-btn action-btn-deactivate btn-user-action" data-user-id="${u.user_id}" data-action="Suspended" title="Suspend Account Access">
                            <i class="fa-solid fa-ban"></i>
                            <span>Suspend</span>
                        </button>
                    </div>
                `;
            }
        } else if (u.status === "Suspended" || u.status === "Rejected") {
            actionButtons = `
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                    <button type="button" class="action-btn action-btn-activate btn-user-action" data-user-id="${u.user_id}" data-action="Active" title="Reactivate Account">
                        <i class="fa-solid fa-rotate-left"></i>
                        <span>Activate</span>
                    </button>
                </div>
            `;
        }

        return `
            <tr>
                <td>
                    <span class="tracking-pill" style="font-family: monospace;">#USR-${u.user_id}</span>
                </td>
                <td>
                    <div class="customer-cell">
                        <strong>${escapeHtml(u.name)}</strong>
                        ${u.business_name ? `<span class="cell-subtext" style="color: #c084fc;"><i class="fa-solid fa-store" style="font-size: 10px; margin-right: 3px;"></i>${escapeHtml(u.business_name)}</span>` : ""}
                    </div>
                </td>
                <td>
                    <div class="customer-cell">
                        <span style="font-size: 13px; color: #f1f5f9;">${escapeHtml(u.email)}</span>
                        <span class="cell-subtext">${escapeHtml(u.phone || "—")}</span>
                    </div>
                </td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${linkedEntity}</td>
                <td>
                    <span class="date-cell">${escapeHtml(u.created_at || "—")}</span>
                </td>
                <td style="text-align: right;">
                    ${actionButtons}
                </td>
            </tr>
        `;
    }).join("");

    // Bind action button clicks
    tableBody.querySelectorAll(".btn-user-action").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            const userId = btn.getAttribute("data-user-id");
            const newStatus = btn.getAttribute("data-action");
            if (!userId || !newStatus) return;

            const actionLabel = newStatus === "Active" ? "approve/activate" : (newStatus === "Rejected" ? "reject" : "suspend");
            if (!confirm(`Are you sure you want to ${actionLabel} user account #USR-${userId}?`)) {
                return;
            }

            await updateUserStatus(userId, newStatus);
        });
    });
}


async function updateUserStatus(userId, newStatus) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Failed to update user status");
        }

        showToast("Account Updated", result.message || `User account status changed to ${newStatus}.`);
        loadUsersTable();
    } catch (err) {
        console.error("Error updating user status:", err);
        showToast("Operation Failed", err.message);
    }
}


function getRoleBadgeHtml(role) {
    if (role === "Administrator") {
        return `<span class="status-badge badge-role-admin">Admin</span>`;
    } else if (role === "Courier Partner") {
        return `<span class="status-badge badge-role-courier">Courier</span>`;
    } else if (role === "Seller/Vendor") {
        return `<span class="status-badge badge-role-vendor">Vendor</span>`;
    } else {
        return `<span class="status-badge badge-role-customer">Customer</span>`;
    }
}


function getUserStatusBadgeHtml(status) {
    if (status === "Active") {
        return `<span class="status-badge status-delivered">Active</span>`;
    } else if (status === "Pending") {
        return `<span class="status-badge status-out" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-color: rgba(245, 158, 11, 0.3);">Pending</span>`;
    } else if (status === "Suspended") {
        return `<span class="status-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">Suspended</span>`;
    } else if (status === "Rejected") {
        return `<span class="status-badge" style="background: rgba(148, 163, 184, 0.15); color: #94a3b8; border-color: rgba(148, 163, 184, 0.3);">Rejected</span>`;
    }
    return `<span class="status-badge status-pending">${escapeHtml(status || "Unknown")}</span>`;
}