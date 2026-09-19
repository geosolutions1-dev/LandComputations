class SurveyCalculator {
    constructor() {
        this.converter = new CoordinateConverter();
    }

    calculateDistance(p1, p2) {
        const dx = p2.easting - p1.easting;
        const dy = p2.northing - p1.northing;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateBearing(p1, p2) {
        const dx = p2.easting - p1.easting;
        const dy = p2.northing - p1.northing;
        let bearing = Math.atan2(dx, dy) * (180 / Math.PI);
        if (bearing < 0) bearing += 360;
        return this.converter.decimalToBearing(bearing);
    }

    calculateArea(coordinates) {
        if (coordinates.length < 3) return 0;
        let area = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            area += coordinates[i].northing * coordinates[j].easting;
            area -= coordinates[j].northing * coordinates[i].easting;
        }
        area = Math.abs(area) / 2;
        const acres = area / 43560;
        const hectares = acres * 0.404686;
        return {
            squareFeet: area,
            acres: acres,
            hectares: hectares
        };
    }

    calculatePerimeter(coordinates) {
        let perimeter = 0;
        for (let i = 0; i < coordinates.length; i++) {
            const j = (i + 1) % coordinates.length;
            perimeter += this.calculateDistance(coordinates[i], coordinates[j]);
        }
        return perimeter;
    }

    calculateClosure(coordinates) {
        if (coordinates.length < 2) return null;
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];
        const errorN = last.northing - first.northing;
        const errorE = last.easting - first.easting;
        const errorTotal = Math.sqrt(errorN * errorN + errorE * errorE);
        let totalDist = 0;
        for (let i = 0; i < coordinates.length - 1; i++) {
            totalDist += this.calculateDistance(coordinates[i], coordinates[i+1]);
        }
        const ratio = totalDist > 0 ? 1 / (totalDist / errorTotal) : 0;
        return {
            errorN: errorN,
            errorE: errorE,
            errorTotal: errorTotal,
            ratio: ratio,
            precision: ratio > 0 ? `1:${Math.round(1/ratio)}` : 'N/A'
        };
    }
}