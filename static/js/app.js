document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupParcelsView();
    setupBranchesView();
    setupShipmentsView();
    setupVehiclesView();
    setupCustomersView();
    setupAssignShipmentModal();
    loadDashboard();
    loadCustomers();
    loadBranches();
    setupParcelModal();
    setupTracking();
});


// =========================================================
// DASHBOARD
// =========================================================

async function loadDashboard() {
    try {
        const response = await fetch("/api/dashboard");

        if (!response.ok) {
            throw new Error("Failed to load dashboard");
        }

        const data = await response.json();

        updateStats(data.stats);
        updateRecentParcels(data.recent_parcels);
    } catch (error) {
        console.error("Dashboard error:", error);
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

        showFormMessage(
            `Parcel created successfully! Tracking number: ${data.tracking_number}`,
            "success"
        );


        showToast(
            "Parcel Created",
            `Tracking ID: ${data.tracking_number}`
        );


        form.reset();


        await loadDashboard();

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
    const navVehicles = document.getElementById("navVehicles");
    const navCustomers = document.getElementById("navCustomers");
    const navBranches = document.getElementById("navBranches");
    const viewAllButton = document.getElementById("viewAllParcelsButton");
    const assignShipmentButton = document.getElementById("assignShipmentButton");
    const shipmentsAssignButton = document.getElementById("shipmentsAssignButton");

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
}


function switchToView(viewName) {
    const dashboardView = document.getElementById("dashboardView");
    const parcelsView = document.getElementById("parcelsView");
    const shipmentsView = document.getElementById("shipmentsView");
    const vehiclesView = document.getElementById("vehiclesView");
    const customersView = document.getElementById("customersView");
    const branchesView = document.getElementById("branchesView");
    const navDashboard = document.getElementById("navDashboard");
    const navParcels = document.getElementById("navParcels");
    const navShipments = document.getElementById("navShipments");
    const navVehicles = document.getElementById("navVehicles");
    const navCustomers = document.getElementById("navCustomers");
    const navBranches = document.getElementById("navBranches");
    const topbarTitle = document.getElementById("topbarTitle");
    const topbarSubtitle = document.getElementById("topbarSubtitle");

    if (viewName === "shipments") {
        if (dashboardView) dashboardView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "none";
        if (customersView) customersView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navParcels) navParcels.classList.remove("active");
        if (navVehicles) navVehicles.classList.remove("active");
        if (navCustomers) navCustomers.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navShipments) navShipments.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Shipments";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage shipments, routes, delivery progress, and operational status.";

        loadShipmentStats();
        loadShipmentsTable();
    } else if (viewName === "vehicles") {
        if (dashboardView) dashboardView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "none";
        if (customersView) customersView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navParcels) navParcels.classList.remove("active");
        if (navShipments) navShipments.classList.remove("active");
        if (navCustomers) navCustomers.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navVehicles) navVehicles.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Fleet Vehicles";
        if (topbarSubtitle) topbarSubtitle.textContent = "Monitor delivery vehicles, fleet capacity, and branch assignments.";

        loadVehicleStats();
        loadVehiclesTable();
    } else if (viewName === "customers") {
        if (dashboardView) dashboardView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (customersView) customersView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navParcels) navParcels.classList.remove("active");
        if (navShipments) navShipments.classList.remove("active");
        if (navVehicles) navVehicles.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navCustomers) navCustomers.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Customers";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage customer profiles, contact information, and shipment activity.";

        loadCustomerStats();
        loadCustomersTable();
    } else if (viewName === "branches") {
        if (dashboardView) dashboardView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "none";
        if (customersView) customersView.style.display = "none";
        if (branchesView) branchesView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navParcels) navParcels.classList.remove("active");
        if (navShipments) navShipments.classList.remove("active");
        if (navVehicles) navVehicles.classList.remove("active");
        if (navCustomers) navCustomers.classList.remove("active");
        if (navBranches) navBranches.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Branch Management";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage courier branches, locations, and operational status.";

        loadBranchStats();
        loadBranchesTable();
    } else if (viewName === "parcels") {
        if (dashboardView) dashboardView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "none";
        if (customersView) customersView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navShipments) navShipments.classList.remove("active");
        if (navVehicles) navVehicles.classList.remove("active");
        if (navCustomers) navCustomers.classList.remove("active");
        if (navParcels) navParcels.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Parcels";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage and track all shipments";

        loadParcels();
    } else {
        if (parcelsView) parcelsView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (shipmentsView) shipmentsView.style.display = "none";
        if (vehiclesView) vehiclesView.style.display = "none";
        if (customersView) customersView.style.display = "none";
        if (dashboardView) dashboardView.style.display = "block";

        if (navParcels) navParcels.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navShipments) navShipments.classList.remove("active");
        if (navVehicles) navVehicles.classList.remove("active");
        if (navCustomers) navCustomers.classList.remove("active");
        if (navDashboard) navDashboard.classList.add("active");

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
                    <div class="route-cell">
                        <span class="route-point">${originText}</span>
                        <i class="fa-solid fa-arrow-right route-arrow"></i>
                        <span class="route-point">${destText}</span>
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