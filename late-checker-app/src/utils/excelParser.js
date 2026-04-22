import * as XLSX from 'xlsx';

const LATE_THRESHOLD = 9 * 60 + 31;

const normalizeKey = (key) => String(key || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const findColumn = (keys, candidates, exclusions = []) => {
    const scored = keys
        .map((key) => {
            const normalized = normalizeKey(key);
            if (exclusions.some((item) => normalized.includes(item))) return null;

            const score = candidates.reduce((best, candidate, index) => {
                if (normalized === candidate) return Math.max(best, 100 - index);
                if (normalized.includes(candidate)) return Math.max(best, 50 - index);
                return best;
            }, 0);

            return score > 0 ? { key, score } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

    return scored[0]?.key;
};

const formatDateKey = (year, month, day) => {
    const yyyy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const parseExcelSerialDate = (value) => {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return {
        date: formatDateKey(parsed.y, parsed.m, parsed.d),
        minutes: parsed.H * 60 + parsed.M
    };
};

const parseDate = (value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return formatDateKey(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    if (typeof value === 'number' && value > 1) {
        return parseExcelSerialDate(value)?.date || null;
    }

    if (typeof value !== 'string') return null;

    const text = value.trim();
    if (!text) return null;

    const isoMatch = text.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (isoMatch) {
        return formatDateKey(isoMatch[1], isoMatch[2], isoMatch[3]);
    }

    const dayFirstMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    if (dayFirstMatch) {
        const year = Number(dayFirstMatch[3]) < 100 ? `20${dayFirstMatch[3]}` : dayFirstMatch[3];
        return formatDateKey(year, dayFirstMatch[2], dayFirstMatch[1]);
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
        return formatDateKey(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
    }

    return null;
};

const parseTime = (value) => {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.getHours() * 60 + value.getMinutes();
    }

    if (typeof value === 'number') {
        const parsed = parseExcelSerialDate(value);
        if (parsed) return parsed.minutes;

        const fractionalDay = value - Math.floor(value);
        const totalSeconds = Math.round(fractionalDay * 24 * 60 * 60);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return hours * 60 + minutes;
    }

    if (typeof value !== 'string') return null;

    const timeMatch = value.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap]\.?m\.?)?\b/i);
    if (!timeMatch) return null;

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const marker = timeMatch[3]?.toLowerCase().replace(/\./g, '');

    if (marker === 'pm' && hours < 12) hours += 12;
    if (marker === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(mins).padStart(2, '0')} ${ampm}`;
};

export const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

                let headerRowIndex = -1;
                for (let i = 0; i < Math.min(40, rawData.length); i++) {
                    const row = rawData[i];
                    if (!row || row.length === 0) continue;

                    const rowStr = row.map((cell) => String(cell).toLowerCase()).join(' ');
                    const hasPerson = rowStr.includes('employee') || rowStr.includes('name') || rowStr.includes('person');
                    const hasPunch = rowStr.includes('time') || rowStr.includes('date') || rowStr.includes('punch') || rowStr.includes('entry');

                    if (hasPerson && hasPunch) {
                        headerRowIndex = i;
                        break;
                    }
                }

                if (headerRowIndex === -1) {
                    headerRowIndex = 0;
                }

                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    range: headerRowIndex,
                    defval: '',
                    raw: true
                });

                const attendanceMap = new Map();
                const uniqueEmployees = new Set();
                const uniqueDates = new Set();

                jsonData.forEach((row, rowIndex) => {
                    const keys = Object.keys(row);
                    const nameKey = findColumn(keys, ['employeename', 'username', 'personname', 'fullname', 'name', 'employee']);
                    const firstNameKey = findColumn(keys, ['firstname']);
                    const lastNameKey = findColumn(keys, ['lastname']);
                    const dateKey = findColumn(keys, ['attendancedate', 'transactiondate', 'punchdate', 'date'], ['update']);
                    const timeKey = findColumn(keys, ['devicetime', 'punchtime', 'transactiontime', 'entrytime', 'clockin', 'intime', 'time'], ['timezone']);

                    if ((!nameKey && !firstNameKey && !lastNameKey) || !timeKey) return;

                    const joinedName = [row[firstNameKey], row[lastNameKey]]
                        .map((part) => String(part || '').trim())
                        .filter(Boolean)
                        .join(' ');
                    const name = joinedName || String(row[nameKey] || '').trim();
                    const rawTime = row[timeKey];
                    if (!name || rawTime === '') return;

                    const timeInMinutes = parseTime(rawTime);
                    if (timeInMinutes === null || Number.isNaN(timeInMinutes)) return;

                    const date = parseDate(dateKey ? row[dateKey] : null) || parseDate(rawTime) || 'Single day';
                    const recordKey = `${name}__${date}`;

                    uniqueEmployees.add(name);
                    if (date !== 'Single day') uniqueDates.add(date);

                    const existing = attendanceMap.get(recordKey);
                    if (!existing || timeInMinutes < existing.firstTimeMinutes) {
                        attendanceMap.set(recordKey, {
                            name,
                            date,
                            firstTimeMinutes: timeInMinutes,
                            sourceRow: rowIndex + headerRowIndex + 2
                        });
                    }
                });

                const allEntries = Array.from(attendanceMap.values()).map((entry) => {
                    const isLate = entry.firstTimeMinutes > LATE_THRESHOLD;
                    return {
                        name: entry.name,
                        date: entry.date,
                        time: formatTime(entry.firstTimeMinutes),
                        isLate,
                        minutesLate: isLate ? entry.firstTimeMinutes - LATE_THRESHOLD : 0,
                        sourceRow: entry.sourceRow
                    };
                });

                const details = allEntries
                    .filter((entry) => entry.isLate)
                    .sort((a, b) => {
                        const dateCompare = a.date.localeCompare(b.date);
                        if (dateCompare !== 0) return dateCompare;
                        return a.name.localeCompare(b.name);
                    });

                const total = allEntries.length;
                const lateCount = details.length;
                const onTimeCount = total - lateCount;
                const latePercentage = total > 0 ? ((lateCount / total) * 100).toFixed(2) : '0.00';

                resolve({
                    summary: {
                        total,
                        late: lateCount,
                        onTime: onTimeCount,
                        latePercentage,
                        uniqueEmployees: uniqueEmployees.size,
                        dateCount: uniqueDates.size || (total > 0 ? 1 : 0)
                    },
                    details
                });
            } catch (error) {
                console.error('Parsing error:', error);
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};
