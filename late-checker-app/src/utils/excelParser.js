
import * as XLSX from 'xlsx';

export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // 1. Convert to array of arrays to find the header row
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 2. Locate header row
        let headerRowIndex = -1;
        
        // Search first 25 rows for a row containing both "Employee" and "Time" (or similar)
        for (let i = 0; i < Math.min(25, rawData.length); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            const rowStr = row.map(c => String(c).toLowerCase()).join(' ');
            
            // Heuristic: Look for keywords
            if (
                (rowStr.includes('employee') || rowStr.includes('name')) && 
                (rowStr.includes('time') || rowStr.includes('date') || rowStr.includes('entry'))
            ) {
                headerRowIndex = i;
                break;
            }
        }
        
        // Fallback: If not found, guess row 0, but if first cell is empty, maybe it's not.
        // Based on user's file inspection, header might be around row 14?
        // Let's stick to the search. If search fails, user might need to adjust, 
        // but for now default to 0 is safest if structure is unknown.
        if (headerRowIndex === -1) {
            console.warn("Could not detect header row automatically. Defaulting to row 0.");
            headerRowIndex = 0; 
        }

        // 3. Re-parse with found header
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });
        
        // 4. Process Data
        const employeesMap = {};
        
        jsonData.forEach(row => {
             // clean keys
             const keys = Object.keys(row);
             
             // Dynamic column detection
             const nameKey = keys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('employee'));
             const timeKey = keys.find(k => k.toLowerCase().includes('time'));
             
             // If we can't find name or time column, skip
             if (!nameKey || !timeKey) return;
             
             const name = row[nameKey];
             let rawTime = row[timeKey];
             
             if (!name || rawTime === undefined || rawTime === null || rawTime === '') return;
             
             // 5. Parse Time
             let timeInMinutes = -1;
             
             if (typeof rawTime === 'number') {
                 // Excel time fraction (e.g. 0.5 = 12:00 PM)
                 // Note: Excel dates are also numbers. 
                 // If it's just a time fraction: < 1 usually.
                 // If it's a date+time: > 1. 
                 // We want the time part.
                 
                 const totalDays = rawTime;
                 const fractionalDay = totalDays - Math.floor(totalDays);
                 const totalSeconds = Math.round(fractionalDay * 24 * 60 * 60);
                 const hours = Math.floor(totalSeconds / 3600);
                 const minutes = Math.floor((totalSeconds % 3600) / 60);
                 timeInMinutes = hours * 60 + minutes;
                 
             } else if (typeof rawTime === 'string') {
                 // "09:45:00" or "9:45 AM"
                 // Simple regex for HH:MM
                 const timeMatch = rawTime.match(/(\d{1,2}):(\d{2})/);
                 if (timeMatch) {
                     let h = parseInt(timeMatch[1]);
                     let m = parseInt(timeMatch[2]);
                     // Check for PM if not in 24h format
                     if (rawTime.toLowerCase().includes('pm') && h < 12) h += 12;
                     if (rawTime.toLowerCase().includes('am') && h === 12) h = 0;
                     
                     timeInMinutes = h * 60 + m;
                 }
             }
             
             if (timeInMinutes !== -1) {
                 if (!employeesMap[name]) {
                     employeesMap[name] = [];
                 }
                 employeesMap[name].push(timeInMinutes);
             }
        });
        
        // 6. Filter First Entry & Determine Late Status
        // Rule: Late if > 9:31 AM (9 * 60 + 31 = 571 minutes)
        const LATE_THRESHOLD = 9 * 60 + 31; 
        
        const results = [];
        let totalEmployees = 0;
        let lateCount = 0;
        let onTimeCount = 0;
        
        Object.keys(employeesMap).sort().forEach(name => {
             const times = employeesMap[name];
             // Get earliest time
             const firstTimeMinutes = Math.min(...times);
             
             const isLate = firstTimeMinutes > LATE_THRESHOLD;
             
             // Format time for display
             const h = Math.floor(firstTimeMinutes / 60);
             const m = firstTimeMinutes % 60;
             const ampm = h >= 12 ? 'PM' : 'AM';
             const hDisp = h % 12 || 12;
             const mDisp = m.toString().padStart(2, '0');
             const formattedTime = `${hDisp}:${mDisp} ${ampm}`;
             
             if (isLate) {
                 lateCount++;
                 results.push({
                     name,
                     time: formattedTime,
                     isLate: true,
                     minutesLate: firstTimeMinutes - LATE_THRESHOLD
                 });
             } else {
                 onTimeCount++;
             }
             totalEmployees++;
        });
        
        // Calculate Percentage
        const latePercentage = totalEmployees > 0 
            ? ((lateCount / totalEmployees) * 100).toFixed(1) 
            : 0;
            
        // Sort results by lateness (most late first? or alpha?)
        // Let's sort alpha by name for now, user didn't specify.
        // Actually, maybe by department? don't have that.
        // Let's sort alphabetically.
        results.sort((a,b) => a.name.localeCompare(b.name));

        resolve({
            summary: {
                total: totalEmployees,
                late: lateCount,
                onTime: onTimeCount,
                latePercentage
            },
            details: results
        });

      } catch (error) {
        console.error("Parsing error:", error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};
