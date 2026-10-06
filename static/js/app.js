document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupParcelsView();
    setupBranchesView();
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
    const navBranches = document.getElementById("navBranches");
    const viewAllButton = document.getElementById("viewAllParcelsButton");

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
}


function switchToView(viewName) {
    const dashboardView = document.getElementById("dashboardView");
    const parcelsView = document.getElementById("parcelsView");
    const branchesView = document.getElementById("branchesView");
    const navDashboard = document.getElementById("navDashboard");
    const navParcels = document.getElementById("navParcels");
    const navBranches = document.getElementById("navBranches");
    const topbarTitle = document.getElementById("topbarTitle");
    const topbarSubtitle = document.getElementById("topbarSubtitle");

    if (viewName === "branches") {
        if (dashboardView) dashboardView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "none";
        if (branchesView) branchesView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navParcels) navParcels.classList.remove("active");
        if (navBranches) navBranches.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Branch Management";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage courier branches, locations, and operational status.";

        loadBranchStats();
        loadBranchesTable();
    } else if (viewName === "parcels") {
        if (dashboardView) dashboardView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (parcelsView) parcelsView.style.display = "block";

        if (navDashboard) navDashboard.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
        if (navParcels) navParcels.classList.add("active");

        if (topbarTitle) topbarTitle.textContent = "Parcels";
        if (topbarSubtitle) topbarSubtitle.textContent = "Manage and track all shipments";

        loadParcels();
    } else {
        if (parcelsView) parcelsView.style.display = "none";
        if (branchesView) branchesView.style.display = "none";
        if (dashboardView) dashboardView.style.display = "block";

        if (navParcels) navParcels.classList.remove("active");
        if (navBranches) navBranches.classList.remove("active");
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