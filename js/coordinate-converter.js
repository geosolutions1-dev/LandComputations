class CoordinateConverter {
    constructor() {
        // EPSG:2136 specific parameters (Accra Ghana)
        this.ellipsoid = {
            a: 6378249.145,
            f: 1/293.465
        };
        this.centralMeridian = -1;
        this.scaleFactor = 0.99975;
        this.falseEasting = 500000;
        this.falseNorthing = 0;
    }

    bearingToDecimal(bearingStr) {
        if (!bearingStr) return 0;
        const parts = bearingStr.match(/(\d+)°\s*(\d+)'/);
        if (!parts) return 0;
        const degrees = parseFloat(parts[1]);
        const minutes = parseFloat(parts[2]);
        return degrees + (minutes / 60);
    }

    decimalToBearing(decimal) {
        let degrees = Math.floor(decimal);
        let minutes = Math.round((decimal - degrees) * 60);
        const degreeStr = String(degrees).padStart(3, '0');
        const minuteStr = String(minutes).padStart(2, '0');
        return `${degreeStr}° ${minuteStr}'`;
    }

    calculateCoordinates(northing, easting, bearing, distance) {
        const bearingRad = this.bearingToDecimal(bearing) * (Math.PI / 180);
        const gridBearing = bearingRad;
        const deltaN = distance * Math.cos(gridBearing);
        const deltaE = distance * Math.sin(gridBearing);
        return {
            northing: northing + deltaN,
            easting: easting + deltaE
        };
    }

    validateCoordinates(coordinates) {
        const validRanges = {
            northing: { min: 0, max: 1000000 },
            easting: { min: 0, max: 2000000 }
        };
        for (const coord of coordinates) {
            if (coord.northing < validRanges.northing.min ||
                coord.northing > validRanges.northing.max) {
                return false;
            }
            if (coord.easting < validRanges.easting.min ||
                coord.easting > validRanges.easting.max) {
                return false;
            }
        }
        return true;
    }
}