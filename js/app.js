class SurveyApp {
    constructor() {
        this.calculator = new SurveyCalculator();
        this.coordinates = [];
        this.planData = [];
        this.baseStation = null;
        this.isPlanComputed = false;

        // DOM Elements
        this.coordinatesBody = document.getElementById('coordinatesBody');
        this.planBody = document.getElementById('planBody');
        this.planDataCard = document.getElementById('planDataCard');
        this.perimeterDisplay = document.getElementById('perimeter');
        this.areaAcresDisplay = document.getElementById('areaAcres');
        this.areaHaDisplay = document.getElementById('areaHa');
        this.totalPointsDisplay = document.getElementById('totalPoints');
        this.coordinateCount = document.getElementById('coordinateCount');
        this.baseStationBadge = document.getElementById('baseStationBadge');
        this.planDataCount = document.getElementById('planDataCount');
        this.baseStationSelect = document.getElementById('baseStationSelect');
        this.targetPointSelect = document.getElementById('targetPointSelect');
        this.rowCountDisplay = document.getElementById('rowCountDisplay');
        this.printOptionSelect = document.getElementById('printOptionSelect');

        // Region and District elements
        this.regionSelect = document.getElementById('regionSelect');
        this.districtSelect = document.getElementById('districtSelect');

        // Message Modal Elements
        this.messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
        this.messageModalHeader = document.getElementById('messageModalHeader');
        this.messageModalTitle = document.getElementById('messageModalTitle');
        this.messageIcon = document.getElementById('messageIcon');
        this.messageTitle = document.getElementById('messageTitle');
        this.messageText = document.getElementById('messageText');
        this.messageModalCloseBtn = document.getElementById('messageModalCloseBtn');

        this.init();
    }

    init() {
        // Event listeners
        document.getElementById('loadCsvBtn').addEventListener('click', () => this.loadCSV());
        document.getElementById('computePlanBtn').addEventListener('click', () => this.computePlanData());
        document.getElementById('clearDataBtn').addEventListener('click', () => this.clearAll());
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateAll());
        document.getElementById('setBaseStationBtn').addEventListener('click', () => this.setBaseStation());

        // Print Plan Data Button
        const printBtn = document.getElementById('printPlanDataBtn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                console.log('Print Plan Data button clicked');
                this.printPlanData();
            });
        }

        // Region and District event listeners
        if (this.regionSelect) {
            this.regionSelect.addEventListener('change', () => this.populateDistricts());
        }

        // Initialize region and district dropdowns
        this.initializeRegionDistrict();

        // Initialize empty table
        this.renderEmptyState();
        this.updateDropdowns();
        this.resetResults();
        this.updateBaseStationBadge();

        console.log('Survey App initialized successfully');
    }

    // Initialize region and district dropdowns
    initializeRegionDistrict() {
        if (!this.regionSelect) return;

        this.regionSelect.innerHTML = '<option value="">Select Region</option>';
        if (typeof ghanaRegions !== 'undefined' && ghanaRegions.length > 0) {
            ghanaRegions.forEach(region => {
                const option = document.createElement('option');
                option.value = region.name;
                option.textContent = region.name;
                this.regionSelect.appendChild(option);
            });
        }

        if (this.districtSelect) {
            this.districtSelect.innerHTML = '<option value="">Select District</option>';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Please select a region first';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            this.districtSelect.appendChild(defaultOption);
        }
    }

    populateDistricts() {
        if (!this.districtSelect || !this.regionSelect) return;

        const selectedRegion = this.regionSelect.value;
        this.districtSelect.innerHTML = '<option value="">Select District</option>';

        if (!selectedRegion) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Please select a region first';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            this.districtSelect.appendChild(defaultOption);
            return;
        }

        const regionData = ghanaRegions.find(r => r.name === selectedRegion);

        if (!regionData) {
            this.showMessage('Error', 'Region data not found.', 'error');
            return;
        }

        if (regionData.districts && regionData.districts.length > 0) {
            const sortedDistricts = [...regionData.districts].sort();
            sortedDistricts.forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                this.districtSelect.appendChild(option);
            });

            this.showMessage(
                'Districts Loaded',
                `Loaded ${sortedDistricts.length} districts for ${selectedRegion}.`,
                'success'
            );
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'No districts available';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            this.districtSelect.appendChild(defaultOption);

            this.showMessage(
                'No Districts',
                `No districts found for ${selectedRegion}.`,
                'warning'
            );
        }
    }

    showMessage(title, message, type = 'info') {
        const colors = {
            success: { header: 'bg-success text-white', icon: 'fa-check-circle', btn: 'btn-success' },
            error: { header: 'bg-danger text-white', icon: 'fa-exclamation-circle', btn: 'btn-danger' },
            warning: { header: 'bg-warning text-dark', icon: 'fa-exclamation-triangle', btn: 'btn-warning' },
            info: { header: 'bg-info text-white', icon: 'fa-info-circle', btn: 'btn-info' }
        };

        const config = colors[type] || colors.info;

        this.messageModalHeader.className = `modal-header ${config.header}`;
        this.messageIcon.className = `fas ${config.icon} me-2`;
        this.messageTitle.textContent = title;
        this.messageText.textContent = message;
        this.messageModalCloseBtn.className = `btn ${config.btn}`;

        this.messageModal.show();
    }

    renderEmptyState() {
        const tbody = this.coordinatesBody;
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="fas fa-cloud-upload-alt fa-2x d-block mb-2"></i>
                    No data loaded. Please load a CSV file.
                </td>
            </tr>
        `;
        this.coordinateCount.textContent = '0 points';
        if (this.rowCountDisplay) {
            this.rowCountDisplay.textContent = 'No data loaded';
        }
    }

    loadCSV() {
        const fileInput = document.getElementById('csvFileInput');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('No File Selected', 'Please select a CSV file to load.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const rows = this.parseCSV(text);

                if (rows.length < 3) {
                    this.showMessage('Invalid CSV', 'CSV must contain at least 3 points.', 'error');
                    return;
                }

                const headers = rows[0].map(h => h.trim().toLowerCase());
                const idIndex = headers.findIndex(h => h === 'id');
                const xIndex = headers.findIndex(h => h === 'x');
                const yIndex = headers.findIndex(h => h === 'y');

                if (idIndex === -1 || xIndex === -1 || yIndex === -1) {
                    this.showMessage('Invalid CSV Format', 'CSV must contain columns: id, x, y', 'error');
                    return;
                }

                const coords = [];
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    if (row.length < 3) continue;

                    const id = row[idIndex].trim();
                    const x = parseFloat(row[xIndex]);
                    const y = parseFloat(row[yIndex]);

                    if (!isNaN(x) && !isNaN(y) && id) {
                        coords.push({ id, x, y });
                    }
                }

                if (coords.length < 3) {
                    this.showMessage('Invalid Data', 'Please check your CSV format. Minimum 3 points required.', 'error');
                    return;
                }

                this.coordinates = coords;
                this.baseStation = coords[0].id;
                this.renderCoordinates();
                this.updateDropdowns();
                this.isPlanComputed = false;
                this.planDataCard.style.display = 'none';
                this.planBody.innerHTML = '';
                this.showMessage(
                    'CSV Loaded Successfully',
                    `Successfully loaded ${coords.length} coordinates from CSV.`,
                    'success'
                );

                this.resetResults();

            } catch (error) {
                console.error('Error parsing CSV:', error);
                this.showMessage('Error', 'Error parsing CSV file. Please check the format.', 'error');
            }
        };
        reader.readAsText(file);
    }

    parseCSV(text) {
        const lines = text.split('\n');
        const result = [];

        for (const line of lines) {
            if (line.trim() === '') continue;

            const fields = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    fields.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            fields.push(current.trim());
            result.push(fields);
        }

        return result;
    }

    renderCoordinates() {
        const tbody = this.coordinatesBody;
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.coordinates.length === 0) {
            this.renderEmptyState();
            return;
        }

        this.coordinates.forEach((coord, index) => {
            const row = tbody.insertRow();
            const isBase = coord.id === this.baseStation;

            if (isBase) {
                row.className = 'base-station';
            } else {
                row.className = 'parcel-point';
            }

            row.addEventListener('click', () => {
                document.querySelectorAll('#coordinateTable tbody tr').forEach(r => {
                    r.classList.remove('selected');
                });
                row.classList.add('selected');
            });

            row.innerHTML = `
                <td><input type="text" class="form-control form-control-sm coord-id" value="${coord.id}" data-index="${index}"></td>
                <td><input type="number" step="0.001" class="form-control form-control-sm coord-x" value="${coord.x}" data-index="${index}"></td>
                <td><input type="number" step="0.001" class="form-control form-control-sm coord-y" value="${coord.y}" data-index="${index}"></td>
                <td>
                    <span class="badge ${isBase ? 'bg-warning' : 'bg-info'}">
                        ${isBase ? 'Base Station' : 'Parcel Point'}
                    </span>
                </td>
                <td>
                    ${!isBase ? `<button class="btn btn-danger btn-sm remove-coord" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>` : '<span class="text-muted">Base</span>'}
                </td>
            `;
        });

        document.querySelectorAll('.coord-id, .coord-x, .coord-y').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateCoordinateFromInput(e);
            });
        });

        document.querySelectorAll('.remove-coord').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.closest('.remove-coord').dataset.index);
                this.removeCoordinate(index);
            });
        });

        this.updateCoordinateCount();
        this.updateBaseStationBadge();
        this.calculateAll();
    }

    updateCoordinateFromInput(event) {
        const input = event.target;
        const index = parseInt(input.dataset.index);
        const field = input.className.includes('coord-id') ? 'id' :
                     input.className.includes('coord-x') ? 'x' : 'y';
        const value = field === 'id' ? input.value : parseFloat(input.value);

        if (field !== 'id' && isNaN(value)) {
            this.showMessage('Invalid Input', 'Please enter a valid number.', 'warning');
            return;
        }

        if (field === 'id') {
            const existing = this.coordinates.find((c, i) => c.id === value && i !== index);
            if (existing) {
                this.showMessage('Duplicate ID', 'ID already exists. Please use a unique ID.', 'warning');
                input.value = this.coordinates[index].id;
                return;
            }
        }

        this.coordinates[index][field] = value;

        if (field === 'id' && this.baseStation === this.coordinates[index].oldId) {
            this.baseStation = value;
        }

        this.coordinates[index].oldId = this.coordinates[index].id;

        this.renderCoordinates();
        this.updateDropdowns();
        this.isPlanComputed = false;
        this.planDataCard.style.display = 'none';
        this.calculateAll();
    }

    removeCoordinate(index) {
        const coord = this.coordinates[index];
        if (coord.id === this.baseStation) {
            this.showMessage('Cannot Remove', 'Cannot remove the base station. Select a different base station first.', 'warning');
            return;
        }

        if (this.coordinates.length <= 4) {
            this.showMessage('Cannot Remove', 'You must have at least 3 parcel points.', 'warning');
            return;
        }

        this.coordinates.splice(index, 1);
        this.renderCoordinates();
        this.updateDropdowns();
        this.isPlanComputed = false;
        this.planDataCard.style.display = 'none';
        this.calculateAll();
        this.showMessage('Point Removed', 'Point has been removed successfully.', 'info');
    }

    setBaseStation() {
        const selectedRow = document.querySelector('#coordinateTable tbody tr.selected');
        if (!selectedRow) {
            this.showMessage('No Selection', 'Please click on a row to select it, then click "Set Selected as Base Station"', 'warning');
            return;
        }

        const idInput = selectedRow.querySelector('.coord-id');
        if (!idInput) {
            this.showMessage('Invalid Selection', 'Invalid selection.', 'error');
            return;
        }

        const newBaseId = idInput.value;
        const coord = this.coordinates.find(c => c.id === newBaseId);

        if (!coord) {
            this.showMessage('Not Found', 'Coordinate not found.', 'error');
            return;
        }

        this.baseStation = newBaseId;
        this.renderCoordinates();
        this.updateDropdowns();
        this.isPlanComputed = false;
        this.planDataCard.style.display = 'none';
        this.showMessage('Base Station Set', `Base station set to: ${newBaseId}`, 'success');
    }

    updateDropdowns() {
        const baseSelect = this.baseStationSelect;
        const targetSelect = this.targetPointSelect;

        if (!baseSelect || !targetSelect) return;

        baseSelect.innerHTML = '<option value="">Select base station</option>';
        targetSelect.innerHTML = '<option value="">Select target point</option>';

        if (this.coordinates.length === 0) {
            const option1 = document.createElement('option');
            option1.value = '';
            option1.textContent = 'No data loaded';
            option1.disabled = true;
            baseSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = '';
            option2.textContent = 'No data loaded';
            option2.disabled = true;
            targetSelect.appendChild(option2);
            return;
        }

        this.coordinates.forEach(coord => {
            const baseOption = document.createElement('option');
            baseOption.value = coord.id;
            baseOption.textContent = coord.id;
            if (coord.id === this.baseStation) {
                baseOption.selected = true;
            }
            baseSelect.appendChild(baseOption);

            if (coord.id !== this.baseStation) {
                const targetOption = document.createElement('option');
                targetOption.value = coord.id;
                targetOption.textContent = coord.id;
                targetSelect.appendChild(targetOption);
            }
        });

        if (targetSelect.options.length <= 1) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No parcel points available';
            option.disabled = true;
            targetSelect.appendChild(option);
        }
    }

    updateBaseStationBadge() {
        if (this.baseStation) {
            this.baseStationBadge.textContent = `Base: ${this.baseStation}`;
            this.baseStationBadge.className = 'badge bg-warning text-dark ms-2';
        } else {
            this.baseStationBadge.textContent = 'No base station set';
            this.baseStationBadge.className = 'badge bg-danger text-white ms-2';
        }
    }

    updateCoordinateCount() {
        const count = this.coordinates.length;
        this.coordinateCount.textContent = `${count} points`;
        if (this.rowCountDisplay) {
            if (count === 0) {
                this.rowCountDisplay.textContent = 'No data loaded';
            } else {
                this.rowCountDisplay.textContent = `${count} coordinates loaded`;
            }
        }
    }

    computePlanData() {
        if (this.coordinates.length === 0) {
            this.showMessage('No Data', 'Please load coordinate data first.', 'warning');
            return;
        }

        if (this.coordinates.length < 3) {
            this.showMessage('Insufficient Points', 'Please load at least 3 coordinates first.', 'warning');
            return;
        }

        const baseCoord = this.coordinates.find(c => c.id === this.baseStation);
        if (!baseCoord) {
            this.showMessage('No Base Station', 'Please set a base station first.', 'warning');
            return;
        }

        const targetId = this.targetPointSelect.value;
        if (!targetId) {
            this.showMessage('No Target', 'Please select a target point.', 'warning');
            return;
        }

        const targetCoord = this.coordinates.find(c => c.id === targetId);
        if (!targetCoord) {
            this.showMessage('Not Found', 'Target point not found.', 'error');
            return;
        }

        this.planData = [];
        const planBody = this.planBody;
        if (planBody) planBody.innerHTML = '';

        const baseToTargetDist = this.calculator.calculateDistance(
            { northing: baseCoord.x, easting: baseCoord.y },
            { northing: targetCoord.x, easting: targetCoord.y }
        );
        const baseToTargetBearing = this.calculator.calculateBearing(
            { northing: baseCoord.x, easting: baseCoord.y },
            { northing: targetCoord.x, easting: targetCoord.y }
        );

        this.planData.push({
            from: baseCoord.id,
            fromX: baseCoord.x,
            fromY: baseCoord.y,
            to: targetCoord.id,
            toX: targetCoord.x,
            toY: targetCoord.y,
            bearing: baseToTargetBearing,
            distance: baseToTargetDist,
            type: 'Base to Target'
        });

        const parcelPoints = this.coordinates
            .filter(c => c.id !== this.baseStation)
            .map(c => ({
                id: c.id,
                x: c.x,
                y: c.y
            }));

        const originalOrder = this.coordinates
            .filter(c => c.id !== this.baseStation)
            .map(c => c.id);

        if (originalOrder.length < 3) {
            this.showMessage('Insufficient Points', 'Need at least 3 parcel points to form a polygon.', 'warning');
            return;
        }

        const polygonPoints = [];
        for (const id of originalOrder) {
            const point = parcelPoints.find(p => p.id === id);
            if (point) {
                polygonPoints.push(point);
            }
        }

        if (polygonPoints.length > 0) {
            polygonPoints.push({ ...polygonPoints[0] });
        }

        for (let i = 0; i < polygonPoints.length - 1; i++) {
            const from = polygonPoints[i];
            const to = polygonPoints[i + 1];

            const dist = this.calculator.calculateDistance(
                { northing: from.x, easting: from.y },
                { northing: to.x, easting: to.y }
            );

            const bearing = this.calculator.calculateBearing(
                { northing: from.x, easting: from.y },
                { northing: to.x, easting: to.y }
            );

            const isClosing = (i === polygonPoints.length - 2);

            this.planData.push({
                from: from.id,
                fromX: from.x,
                fromY: from.y,
                to: to.id,
                toX: to.x,
                toY: to.y,
                bearing: bearing,
                distance: dist,
                type: isClosing ? 'Closing' : 'Parcel Side'
            });
        }

        this.renderPlanData();
        this.planDataCard.style.display = 'block';
        this.isPlanComputed = true;
        this.showMessage('Plan Computed', `Plan data computed with ${this.planData.length} courses.`, 'success');

        this.calculateAll();
    }

    renderPlanData() {
        const planBody = this.planBody;
        if (!planBody) return;

        planBody.innerHTML = '';

        this.planData.forEach((plan, index) => {
            const row = planBody.insertRow();
            const isBaseRow = plan.type === 'Base to Target';
            const isClosing = plan.type === 'Closing';

            if (isBaseRow) {
                row.className = 'plan-base-row';
            } else if (isClosing) {
                row.className = 'plan-closing-row';
            } else {
                row.className = 'plan-parcel-row';
            }

            row.innerHTML = `
                <td><strong>${plan.from}</strong></td>
                <td>${plan.fromX.toFixed(3)}</td>
                <td>${plan.fromY.toFixed(3)}</td>
                <td>${plan.bearing}</td>
                <td>${plan.distance.toFixed(2)}</td>
                <td><strong>${plan.to}</strong></td>
            `;
        });

        this.planDataCount.textContent = `${this.planData.length} courses`;
    }

    calculateAll() {
        if (this.coordinates.length < 3) {
            this.resetResults();
            return;
        }

        try {
            const parcelPoints = this.coordinates
                .filter(c => c.id !== this.baseStation)
                .map(c => ({
                    northing: c.x,
                    easting: c.y
                }));

            if (parcelPoints.length < 3) {
                this.resetResults();
                return;
            }

            const areaResult = this.calculator.calculateArea(parcelPoints);
            if (areaResult) {
                this.areaAcresDisplay.textContent = areaResult.acres.toFixed(4);
                this.areaHaDisplay.textContent = areaResult.hectares.toFixed(4);
            }

            const perimeter = this.calculator.calculatePerimeter(parcelPoints);
            this.perimeterDisplay.textContent = perimeter.toFixed(2) + ' ft';

            this.totalPointsDisplay.textContent = this.coordinates.length;
            this.updateCoordinateCount();

        } catch (error) {
            console.error('Calculation error:', error);
            this.showMessage('Calculation Error', 'Error calculating results. Please check your data.', 'error');
        }
    }

    resetResults() {
        this.perimeterDisplay.textContent = '0.00 ft';
        this.areaAcresDisplay.textContent = '0.00';
        this.areaHaDisplay.textContent = '0.00';
        this.totalPointsDisplay.textContent = '0';
    }

    clearAll() {
        this.messageModalHeader.className = 'modal-header bg-warning text-dark';
        this.messageIcon.className = 'fas fa-exclamation-triangle me-2';
        this.messageTitle.textContent = 'Confirm Clear';
        this.messageText.textContent = 'Are you sure you want to clear all data? This action cannot be undone.';
        this.messageModalCloseBtn.className = 'btn btn-secondary';

        const footer = document.querySelector('#messageModal .modal-footer');
        const existingConfirm = footer.querySelector('#confirmClearBtn');
        if (existingConfirm) {
            existingConfirm.remove();
        }

        const confirmBtn = document.createElement('button');
        confirmBtn.id = 'confirmClearBtn';
        confirmBtn.className = 'btn btn-danger';
        confirmBtn.innerHTML = '<i class="fas fa-trash"></i> Yes, Clear All';
        confirmBtn.onclick = () => {
            this.performClearAll();
            this.messageModal.hide();
            confirmBtn.remove();
        };
        footer.prepend(confirmBtn);

        this.messageModal.show();
    }

    performClearAll() {
        this.coordinates = [];
        this.planData = [];
        this.baseStation = null;
        this.isPlanComputed = false;
        this.renderEmptyState();
        this.planBody.innerHTML = '';
        this.planDataCard.style.display = 'none';

        this.resetResults();
        this.coordinateCount.textContent = '0 points';
        this.baseStationBadge.textContent = 'No base station set';
        this.baseStationBadge.className = 'badge bg-danger text-white ms-2';

        this.updateDropdowns();

        this.regionSelect.value = '';
        this.districtSelect.innerHTML = '<option value="">Select District</option>';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Please select a region first';
        defaultOption.disabled = true;
        defaultOption.selected = true;
        this.districtSelect.appendChild(defaultOption);

        document.getElementById('ownerName').value = '';
        document.getElementById('locality').value = '';
        document.getElementById('surveyorName').value = '';
        document.getElementById('licenseNumber').value = '';
        document.getElementById('survNumber').value = '';

        document.getElementById('csvFileInput').value = '';

        if (this.rowCountDisplay) {
            this.rowCountDisplay.textContent = 'No data loaded';
        }

        this.showMessage('Data Cleared', 'All data has been cleared successfully.', 'info');
    }

    printPlanData() {
        console.log('printPlanData method called');

        if (this.coordinates.length < 3) {
            this.showMessage('No Data', 'Please load coordinate data first.', 'warning');
            return;
        }

        // Logo — use a path relative to the current page for both preview and popup
        const logoSrc = 'flyer/GeoBaseLogoFlyer.png';
        const logoHTML = `<div style="text-align:center; margin-bottom:4px;">
            <img src="${logoSrc}" alt="GeoBase Logo" style="max-height:80px; max-width:260px; object-fit:contain;">
        </div>`;

        const printOption = this.printOptionSelect ? this.printOptionSelect.value : 'beacon';
        console.log('Print option selected:', printOption);

        try {
            const ownerName = document.getElementById('ownerName').value || 'N/A';
            const locality = document.getElementById('locality').value || 'N/A';
            const region = document.getElementById('regionSelect').value || 'N/A';
            const district = document.getElementById('districtSelect').value || 'N/A';
            const surveyorName = document.getElementById('surveyorName').value || 'N/A';
            const licenseNumber = document.getElementById('licenseNumber').value || 'N/A';
            const survNumber = document.getElementById('survNumber').value || 'N/A';

            const areaAcres = parseFloat(this.areaAcresDisplay.textContent) || 0;
            const areaHa = parseFloat(this.areaHaDisplay.textContent) || 0;
            const perimeter = this.perimeterDisplay.textContent;

            const currentDateShort = new Date().toLocaleDateString();

            let contentHTML = logoHTML;

            // BEACON INDEX
            if (printOption === 'beacon' || printOption === 'all') {
                let beaconRows = '';
                this.coordinates.forEach(coord => {
                    beaconRows += `
                        <tr>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;"><strong>${coord.id}</strong></td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${coord.x.toFixed(3)}</td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${coord.y.toFixed(3)}</td>
                        </tr>
                    `;
                });

                contentHTML += `
                    <div class="section">
                        <div style="text-align: center;">
                            <h2 style="color: #0d6efd; font-weight: 700; margin-bottom: 15px;">BEACON INDEX</h2>
                            <hr style="border: 1px solid #0d6efd;">
                            <div style="font-size: 12px; text-align: left; margin: 10px 0;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span><strong>Client:</strong> ${ownerName}</span>
                                    <span><strong>Regional No:</strong> ${survNumber}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span><strong>Locality:</strong> ${locality}</span>
                                    <span><strong>Surveyor:</strong> ${surveyorName}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span><strong>Region:</strong> ${region}</span>
                                    <span><strong>License No:</strong> ${licenseNumber}</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                    <span><strong>District:</strong> ${district}</span>
                                    <span><strong>Date:</strong> ${currentDateShort}</span>
                                </div>
                            </div>
                            <hr>
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px;">
                            <thead>
                                <tr>
                                    <th style="background-color: #0d6efd; color: white; text-align: center; padding: 8px; border: 1px solid #0d6efd;">ID</th>
                                    <th style="background-color: #0d6efd; color: white; text-align: center; padding: 8px; border: 1px solid #0d6efd;">X (Northing)</th>
                                    <th style="background-color: #0d6efd; color: white; text-align: center; padding: 8px; border: 1px solid #0d6efd;">Y (Easting)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${beaconRows}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            // PLAN DATA
            if ((printOption === 'plandata' || printOption === 'all') && this.isPlanComputed && this.planData.length > 0) {
                let planRows = '';
                this.planData.forEach((plan, index) => {
                    planRows += `
                        <tr>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;"><strong>${plan.from}</strong></td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${plan.fromX.toFixed(3)}</td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${plan.fromY.toFixed(3)}</td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${plan.bearing}</td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;">${plan.distance.toFixed(2)}</td>
                            <td style="text-align: center; padding: 6px 8px; border: 1px solid #dee2e6;"><strong>${plan.to}</strong></td>
                        </tr>
                    `;
                });

                contentHTML += `
                    <div class="section">
                        <div style="text-align: center;">
                            <h2 style="color: #198754; font-weight: 700; margin-bottom: 15px;">PLAN DATA</h2>
                            <h4 style="color: #6c757d; font-size: 14px; margin-bottom: 15px;">Bearings &amp; Distances</h4>
                            <hr style="border: 1px solid #198754;">
                        </div>
                        <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
                            <thead>
                                <tr>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">From</th>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">X (Northing)</th>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">Y (Easting)</th>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">Bearing</th>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">Distance (ft)</th>
                                    <th style="background-color: #198754; color: white; text-align: center; padding: 6px; border: 1px solid #198754;">To</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${planRows}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            // AREA SUMMARY
            if (printOption === 'area' || printOption === 'all') {
                contentHTML += `
                    <div class="section">
                        <div style="text-align: center;">
                            <h2 style="color: #dc3545; font-weight: 700; margin-bottom: 15px;">AREA SUMMARY</h2>
                            <hr style="border: 1px solid #dc3545;">
                        </div>
                        <div style="margin: 20px auto; max-width: 500px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa; font-weight: 600;">Perimeter</td>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: 600;">${perimeter}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa; font-weight: 600;">Area</td>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: 600; color: #0d6efd;">${areaAcres.toFixed(2)} Acre(s)</td>
                                </tr>
                                <tr>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; background-color: #f8f9fa; font-weight: 600;">Area</td>
                                    <td style="padding: 12px; border: 1px solid #dee2e6; text-align: right; font-weight: 600; color: #198754;">${areaHa.toFixed(2)} Hect(s)</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                `;
            }

            // Create the complete modal content - NO FOOTER HERE
            const modalContent = `
                <div id="printContent" style="background: white; padding: 30px; border-radius: 5px; font-family: Arial, Helvetica, sans-serif; max-width: 100%;">
                    ${contentHTML}
                </div>
            `;

            // Show modal with preview
            const modalHTML = `
                <div class="modal fade" id="printPreviewModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title"><i class="fas fa-file-pdf text-danger"></i> Print Preview - ${printOption === 'beacon' ? 'Beacon Index' : printOption === 'plandata' ? 'Plan Data' : printOption === 'area' ? 'Area Summary' : 'Complete Report'}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body" style="background: #f8f9fa; max-height: 70vh; overflow-y: auto; padding: 20px;">
                                <div style="background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    ${modalContent}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                                <button type="button" class="btn btn-danger" id="downloadPdfBtn">
                                    <i class="fas fa-download"></i> Download PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('printPreviewModal');
            if (existingModal) {
                existingModal.remove();
            }

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const modal = new bootstrap.Modal(document.getElementById('printPreviewModal'));
            modal.show();

            document.getElementById('downloadPdfBtn').addEventListener('click', () => {
                this.generatePDF(printOption);
            });

        } catch (error) {
            console.error('Error preparing print:', error);
            this.showMessage('Error', 'Error preparing print. Please try again.', 'error');
        }
    }

    generatePDF(printOption) {
        try {
            // Get the content - NO FOOTER in content
            const content = document.getElementById('printContent');
            if (!content) {
                this.showMessage('Error', 'Content not found. Please try again.', 'error');
                return;
            }

            // Create a new window for printing
            const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
            if (!printWindow) {
                this.showMessage('Error', 'Please allow popups for this website.', 'error');
                return;
            }

            const currentDate = new Date().toLocaleString();

            // Build the print document - ONLY ONE FOOTER at the end
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title></title>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                            padding: 30px;
                            background: white;
                            font-size: 12px;
                        }
                        #printContent { max-width: 100%; }
                        h2 {
                            color: #0d6efd;
                            font-weight: 700;
                            text-align: center;
                            margin: 4px 0 10px 0;
                        }
                        h4 { color: #6c757d; text-align: center; margin: 5px 0 15px 0; }
                        hr {
                            border: 1px solid #0d6efd;
                            margin: 15px 0;
                            clear: both;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 10px 0;
                            font-size: 10px;
                        }
                        table th {
                            background-color: #0d6efd;
                            color: white;
                            padding: 6px 8px;
                            border: 1px solid #0d6efd;
                            text-align: center;
                            font-weight: 600;
                        }
                        table td {
                            padding: 5px 8px;
                            border: 1px solid #dee2e6;
                            text-align: center;
                        }
                        table tr:nth-child(even) { background-color: #f8f9fa; }
                        .beacon-info {
                            font-size: 11px;
                            margin: 10px 0;
                            display: flex;
                            flex-wrap: wrap;
                            justify-content: space-between;
                        }
						.section {
                            margin-bottom: 25px;
                            page-break-inside: auto; /* allow long tables to flow onto later pages */
                        }
                        /* Long tables (e.g. Beacon Index) start on page 1 and
                           continue across pages instead of jumping whole to page 2 */
                        table {
                            page-break-inside: auto;
                        }
                        thead {
                            display: table-header-group; /* repeat column headers on each page */
                        }
                        tr, td, th {
                            page-break-inside: avoid;    /* never split a single row across a page */
                        }
                        .area-table {
                            width: 60%;
                            margin: 15px auto;
                            font-size: 13px;
                        }
                        .area-table td {
                            padding: 10px 15px;
                            text-align: left;
                        }
                        .area-table td:last-child {
                            text-align: right;
                            font-weight: 600;
                        }
                        .area-table tr:first-child td { background-color: #f8f9fa; }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }
                        .fw-bold { font-weight: 600; }
                        .mt-2 { margin-top: 20px; }
                        .mb-2 { margin-bottom: 20px; }
                        .color-blue { color: #0d6efd; }
                        .color-green { color: #198754; }
                        .color-red { color: #dc3545; }

                        /* Footer - ONLY ONE at the end */
                        .footer {
                            text-align: center;
                            margin-top: 30px;
                            font-size: 9px;
                            color: #6c757d;
                            border-top: 1px solid #dee2e6;
                            padding-top: 10px;
                            page-break-after: avoid;
                            page-break-inside: avoid;
                        }

                        @page {
                            margin-top: 0;
                            margin-bottom: 15mm;
                            margin-left: 15mm;
                            margin-right: 15mm;
                        }
                        @media print {
                            body { padding-top: 10mm; }
                            -webkit-print-color-adjust: exact;
                        }
                    </style>
                </head>
                <body>
                    ${content.innerHTML}
                    <!-- SINGLE FOOTER - Only at the end -->
                    <div class="footer">
                        <p>Generated on: ${currentDate} | Coordinate System: EPSG:2136 - Accra Ghana National Grid</p>
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                            }, 1500);
                        };
                    <\/script>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            // Close the preview modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('printPreviewModal'));
            if (modal) {
                modal.hide();
            }

            this.showMessage('PDF Generated', 'PDF is being generated. Please save when prompted.', 'success');

        } catch (error) {
            console.error('Error:', error);
            this.showMessage('Error', 'Error generating PDF. Please try again.', 'error');
        }
    }

    generateCertificate() {
        if (this.coordinates.length < 3) {
            this.showMessage('No Data', 'Please load coordinate data first.', 'warning');
            return;
        }

        const ownerName = document.getElementById('ownerName').value || 'N/A';
        const locality = document.getElementById('locality').value || 'N/A';
        const region = this.regionSelect.value || 'N/A';
        const district = this.districtSelect.value || 'N/A';
        const surveyorName = document.getElementById('surveyorName').value || 'N/A';
        const licenseNumber = document.getElementById('licenseNumber').value || 'N/A';
        const survNumber = document.getElementById('survNumber').value || 'N/A';

        const areaAcres = this.areaAcresDisplay.textContent;
        const areaHa = this.areaHaDisplay.textContent;
        const perimeter = this.perimeterDisplay.textContent;
        const totalPoints = this.totalPointsDisplay.textContent;

        let coordSummary = '';
        this.coordinates.forEach(c => {
            const isBase = c.id === this.baseStation;
            coordSummary += `${c.id}: X=${c.x.toFixed(3)}, Y=${c.y.toFixed(3)}${isBase ? ' (Base Station)' : ''}\n`;
        });

        let planSummary = '';
        if (this.isPlanComputed && this.planData.length > 0) {
            this.planData.forEach(p => {
                planSummary += `${p.from} (X=${p.fromX.toFixed(3)}, Y=${p.fromY.toFixed(3)}) → ${p.to} (X=${p.toX.toFixed(3)}, Y=${p.toY.toFixed(3)}): ${p.bearing}, ${p.distance.toFixed(2)} ft [${p.type}]\n`;
            });
        }

        const certificateHTML = `
            <div class="certificate p-4">
                <div class="text-center mb-4">
                    <h2><i class="fas fa-certificate text-primary"></i> LAND SURVEY CERTIFICATE</h2>
                    <p><small>Generated on: ${new Date().toLocaleString()}</small></p>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Owner:</strong> ${ownerName}</p>
                        <p><strong>Locality:</strong> ${locality}</p>
                        <p><strong>Region:</strong> ${region}</p>
                        <p><strong>District:</strong> ${district}</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Regional Number:</strong> ${survNumber}</p>
                        <p><strong>Surveyor:</strong> ${surveyorName}</p>
                        <p><strong>License Number:</strong> ${licenseNumber}</p>
                        <p><strong>Coordinate System:</strong> EPSG:2136</p>
                        <p><strong>Base Station:</strong> ${this.baseStation || 'Not set'}</p>
                    </div>
                </div>

                <hr>

                <div class="row">
                    <div class="col-md-4">
                        <h5>Area</h5>
                        <p><strong>Acres:</strong> ${areaAcres}</p>
                        <p><strong>Hectares:</strong> ${areaHa}</p>
                    </div>
                    <div class="col-md-4">
                        <h5>Perimeter</h5>
                        <p><strong>Total:</strong> ${perimeter}</p>
                    </div>
                    <div class="col-md-4">
                        <h5>Parcel Details</h5>
                        <p><strong>Points:</strong> ${totalPoints}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                <hr>

                <div class="row">
                    <div class="col-md-6">
                        <h5>Coordinate Data</h5>
                        <pre style="font-size: 0.8rem; white-space: pre-wrap;">${coordSummary}</pre>
                    </div>
                    ${this.isPlanComputed ? `
                    <div class="col-md-6">
                        <h5>Plan Data (Bearings & Distances)</h5>
                        <pre style="font-size: 0.8rem; white-space: pre-wrap;">${planSummary}</pre>
                    </div>
                    ` : ''}
                </div>

                <div class="text-center mt-4">
                    <p><em>This certificate is generated for surveying purposes only.</em></p>
                    <p><small>Coordinates System: EPSG:2136 - Accra Ghana</small></p>
                </div>
            </div>
        `;

        const modalHTML = `
            <div class="modal fade" id="certificateModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title"><i class="fas fa-certificate text-primary"></i> Survey Certificate</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${certificateHTML}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="window.print()">
                                <i class="fas fa-print"></i> Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const existingModal = document.getElementById('certificateModal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const modal = new bootstrap.Modal(document.getElementById('certificateModal'));
        modal.show();
    }

    exportData() {
        if (this.coordinates.length < 3) {
            this.showMessage('No Data', 'No data to export.', 'warning');
            return;
        }

        const data = {
            surveyInfo: {
                owner: document.getElementById('ownerName').value || 'N/A',
                locality: document.getElementById('locality').value || 'N/A',
                region: this.regionSelect.value || 'N/A',
                district: this.districtSelect.value || 'N/A',
                surveyor: document.getElementById('surveyorName').value || 'N/A',
                licenseNumber: document.getElementById('licenseNumber').value || 'N/A',
                survNumber: document.getElementById('survNumber').value || 'N/A'
            },
            baseStation: this.baseStation,
            coordinates: this.coordinates,
            planData: this.planData,
            results: {
                perimeter: this.perimeterDisplay.textContent,
                areaAcres: this.areaAcresDisplay.textContent,
                areaHa: this.areaHaDisplay.textContent,
                totalPoints: this.totalPointsDisplay.textContent
            },
            isPlanComputed: this.isPlanComputed,
            timestamp: new Date().toISOString(),
            coordinateSystem: 'EPSG:2136'
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `survey_data_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showMessage('Data Exported', 'Data exported successfully!', 'success');
    }
	
	
	
	
	
	
	
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SurveyApp...');
    new SurveyApp();
});