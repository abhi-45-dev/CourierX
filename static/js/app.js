document.addEventListener("DOMContentLoaded", () => {
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
            await fetch("/api/branches");

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

    const closeButton =
        document.getElementById("closeParcelModal");

    const cancelButton =
        document.getElementById("cancelParcel");

    const form =
        document.getElementById("parcelForm");

    if (!modal || !openButton || !form) {
        return;
    }

    openButton.addEventListener(
        "click",
        () => {
            modal.classList.add("show");

            modal.setAttribute(
                "aria-hidden",
                "false"
            );

            clearFormMessage();
        }
    );

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