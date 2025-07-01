// 부서별 인원 데이터
const departments = {
    center: {
        name: '센터',
        teams: [
            { team: 1, members: [
                { name: '김철수', vehicle: '펌프차 1호' },
                { name: '이영희', vehicle: '펌프차 1호' }
            ]},
            { team: 2, members: [
                { name: '박민수', vehicle: '펌프차 2호' },
                { name: '정수진', vehicle: '펌프차 2호' }
            ]},
            { team: 3, members: [
                { name: '최강호', vehicle: '물탱크차' },
                { name: '한미라', vehicle: '물탱크차' }
            ]}
        ]
    },
    rescue: {
        name: '구조대',
        teams: [
            { team: 1, members: [
                { name: '강동원', vehicle: '구조차 1호' },
                { name: '송지효', vehicle: '구조차 1호' }
            ]},
            { team: 2, members: [
                { name: '유재석', vehicle: '구조차 2호' },
                { name: '김태희', vehicle: '구조차 2호' }
            ]},
            { team: 3, members: [
                { name: '이승기', vehicle: '구조공작차' },
                { name: '박보영', vehicle: '구조공작차' }
            ]}
        ]
    },
    emergency: {
        name: '구급대',
        teams: [
            { team: 1, members: [
                { name: '정우성', vehicle: '구급차 1호' },
                { name: '김하늘', vehicle: '구급차 1호' }
            ]},
            { team: 2, members: [
                { name: '조인성', vehicle: '구급차 2호' },
                { name: '전지현', vehicle: '구급차 2호' }
            ]},
            { team: 3, members: [
                { name: '현빈', vehicle: '구급차 3호' },
                { name: '손예진', vehicle: '구급차 3호' }
            ]}
        ]
    }
};

// 3조 2교대 근무 패턴
const shiftPattern = {
    1: ['duty', 'off', 'off'],  // 1조: 당번-비번-비번
    2: ['off', 'duty', 'off'],  // 2조: 비번-당번-비번
    3: ['off', 'off', 'duty']   // 3조: 비번-비번-당번
};

// 특별 근무 및 복무 사항 (예시)
const specialSchedules = {
    '김철수': { 15: 'leave', 16: 'leave', 17: 'leave' }, // 15-17일 연가
    '박민수': { 8: 'trip', 9: 'trip' }, // 8-9일 출장
    '이영희': { 22: 'out' }, // 22일 외출
    '강동원': { 5: 'day', 6: 'day' }, // 5-6일 일근
    '유재석': { 10: 'morning', 11: 'morning' }, // 10-11일 주간
    '정우성': { 20: 'night', 21: 'night' } // 20-21일 야간
};

// 현재 월 정보
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 현재 월 표시
    document.getElementById('currentMonth').textContent = 
        `${currentYear}년 ${currentMonth + 1}월`;
    
    // 각 부서별 날짜 헤더 생성
    createDateHeaders('center');
    createDateHeaders('rescue');
    createDateHeaders('emergency');
    
    // 각 부서별 근무표 생성
    generateSchedule('center');
    generateSchedule('rescue');
    generateSchedule('emergency');
    
    // 통계 생성
    generateStatistics();
});

// 날짜 헤더 생성
function createDateHeaders(departmentId) {
    const daysElement = document.getElementById(departmentId + 'Days');
    let daysHTML = '';
    
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        
        daysHTML += `<th style="${isWeekend ? 'background-color: #ffebee;' : ''}">${day}<br><small>${dayOfWeek}</small></th>`;
    }
    
    daysElement.innerHTML = daysHTML;
}

// 근무표 생성
function generateSchedule(departmentId) {
    const department = departments[departmentId];
    const tbody = document.getElementById(departmentId + 'Schedule');
    let html = '';
    
    department.teams.forEach(team => {
        team.members.forEach(member => {
            html += '<tr>';
            html += `<td>${member.name}</td>`;
            html += `<td>${team.team}조</td>`;
            html += `<td>${member.vehicle}</td>`;
            
            // 각 날짜별 근무 상태
            for (let day = 1; day <= daysInMonth; day++) {
                const shift = getShiftForDay(member.name, team.team, day);
                html += `<td class="${shift.type}">${shift.text}</td>`;
            }
            
            html += '</tr>';
        });
    });
    
    tbody.innerHTML = html;
}

// 특정 날짜의 근무 상태 확인
function getShiftForDay(memberName, teamNumber, day) {
    // 특별 근무 확인
    if (specialSchedules[memberName] && specialSchedules[memberName][day]) {
        const specialShift = specialSchedules[memberName][day];
        return {
            type: specialShift,
            text: getShiftText(specialShift)
        };
    }
    
    // 일반 3조 2교대 패턴
    const cycleDay = ((day - 1) % 3);
    const shift = shiftPattern[teamNumber][cycleDay];
    
    return {
        type: shift,
        text: getShiftText(shift)
    };
}

// 근무 타입별 텍스트
function getShiftText(shiftType) {
    const shiftTexts = {
        'duty': '당',
        'off': '비',
        'day': '일',
        'morning': '주',
        'night': '야',
        'leave': '연',
        'trip': '출',
        'out': '외'
    };
    return shiftTexts[shiftType] || '';
}

// 부서 탭 전환
function showDepartment(departmentId) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 모든 부서 섹션 숨기기
    document.querySelectorAll('.department-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 선택된 탭 활성화
    event.target.classList.add('active');
    
    // 선택된 부서 섹션 표시
    document.getElementById(departmentId).style.display = 'block';
}

// 통계 생성
function generateStatistics() {
    const stats = {
        totalPersonnel: 0,
        dutyDays: 0,
        offDays: 0,
        leaveDays: 0,
        tripDays: 0
    };
    
    // 모든 부서의 인원 수 계산
    Object.values(departments).forEach(dept => {
        dept.teams.forEach(team => {
            stats.totalPersonnel += team.members.length;
        });
    });
    
    // 근무 일수 계산 (예시)
    stats.dutyDays = Math.floor(daysInMonth / 3) * stats.totalPersonnel;
    stats.offDays = Math.floor(daysInMonth * 2 / 3) * stats.totalPersonnel;
    stats.leaveDays = Object.values(specialSchedules).reduce((sum, schedule) => {
        return sum + Object.values(schedule).filter(s => s === 'leave').length;
    }, 0);
    stats.tripDays = Object.values(specialSchedules).reduce((sum, schedule) => {
        return sum + Object.values(schedule).filter(s => s === 'trip').length;
    }, 0);
    
    // 통계 HTML 생성
    const statsHTML = `
        <div class="stat-item">
            <h4>총 인원</h4>
            <p>${stats.totalPersonnel}명</p>
        </div>
        <div class="stat-item">
            <h4>월 총 당번일수</h4>
            <p>${stats.dutyDays}일</p>
        </div>
        <div class="stat-item">
            <h4>월 총 비번일수</h4>
            <p>${stats.offDays}일</p>
        </div>
        <div class="stat-item">
            <h4>연가 사용</h4>
            <p>${stats.leaveDays}일</p>
        </div>
        <div class="stat-item">
            <h4>출장</h4>
            <p>${stats.tripDays}일</p>
        </div>
    `;
    
    document.getElementById('stats').innerHTML = statsHTML;
}

// 수정 모드 관련 변수
let isEditMode = false;
let currentEditCell = null;
let originalSchedule = {};
let modifiedSchedule = {};

// 수정 모드 토글
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('editModeBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (isEditMode) {
        editBtn.classList.add('active');
        editBtn.innerHTML = '<span class="edit-icon">✏️</span> 수정 중...';
        saveBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        
        // 원본 데이터 백업
        backupOriginalSchedule();
        
        // 모든 근무 셀을 수정 가능하게 만들기
        enableEditableCells();
    } else {
        editBtn.classList.remove('active');
        editBtn.innerHTML = '<span class="edit-icon">✏️</span> 수정 모드';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
        
        // 수정 가능 상태 해제
        disableEditableCells();
    }
}

// 원본 스케줄 백업
function backupOriginalSchedule() {
    originalSchedule = JSON.parse(JSON.stringify(specialSchedules));
    modifiedSchedule = JSON.parse(JSON.stringify(specialSchedules));
}

// 셀 수정 가능하게 만들기
function enableEditableCells() {
    const cells = document.querySelectorAll('.schedule-table td');
    cells.forEach((cell, index) => {
        // 이름, 조, 차량 열은 제외
        if (index % (daysInMonth + 3) > 2) {
            cell.classList.add('editable');
            cell.onclick = function() {
                if (isEditMode) {
                    openShiftModal(this);
                }
            };
        }
    });
}

// 셀 수정 불가능하게 만들기
function disableEditableCells() {
    const cells = document.querySelectorAll('.schedule-table td');
    cells.forEach(cell => {
        cell.classList.remove('editable');
        cell.onclick = null;
    });
}

// 근무 선택 모달 열기
function openShiftModal(cell) {
    currentEditCell = cell;
    document.getElementById('shiftModal').style.display = 'flex';
}

// 모달 닫기
function closeModal() {
    document.getElementById('shiftModal').style.display = 'none';
    currentEditCell = null;
}

// 근무 상태 선택
function selectShift(shiftType) {
    if (currentEditCell) {
        // 셀 업데이트
        currentEditCell.className = shiftType;
        currentEditCell.textContent = getShiftText(shiftType);
        
        // 데이터 업데이트
        updateScheduleData(currentEditCell, shiftType);
        
        closeModal();
    }
}

// 스케줄 데이터 업데이트
function updateScheduleData(cell, shiftType) {
    const row = cell.parentElement;
    const memberName = row.cells[0].textContent;
    const cellIndex = Array.from(row.cells).indexOf(cell);
    const day = cellIndex - 2; // 이름, 조, 차량 열을 제외한 날짜
    
    if (!modifiedSchedule[memberName]) {
        modifiedSchedule[memberName] = {};
    }
    
    // 기본 패턴과 같으면 특별 스케줄에서 제거
    const teamNumber = parseInt(row.cells[1].textContent);
    const cycleDay = ((day - 1) % 3);
    const defaultShift = shiftPattern[teamNumber][cycleDay];
    
    if (shiftType === defaultShift) {
        delete modifiedSchedule[memberName][day];
        if (Object.keys(modifiedSchedule[memberName]).length === 0) {
            delete modifiedSchedule[memberName];
        }
    } else {
        modifiedSchedule[memberName][day] = shiftType;
    }
}

// 스케줄 저장
function saveSchedule() {
    if (confirm('수정한 근무표를 저장하시겠습니까?')) {
        // 실제 스케줄 업데이트
        Object.keys(specialSchedules).forEach(key => delete specialSchedules[key]);
        Object.assign(specialSchedules, modifiedSchedule);
        
        // 로컬 스토리지에 저장
        localStorage.setItem('fireStationSchedule', JSON.stringify(specialSchedules));
        
        alert('근무표가 저장되었습니다.');
        
        // 수정 모드 종료
        toggleEditMode();
        
        // 통계 업데이트
        generateStatistics();
    }
}

// 수정 취소
function cancelEdit() {
    if (confirm('수정한 내용을 취소하시겠습니까?')) {
        // 원본 데이터로 복원
        Object.keys(specialSchedules).forEach(key => delete specialSchedules[key]);
        Object.assign(specialSchedules, originalSchedule);
        
        // 화면 다시 그리기
        generateSchedule('center');
        generateSchedule('rescue');
        generateSchedule('emergency');
        
        // 수정 모드 종료
        toggleEditMode();
    }
}

// 페이지 로드 시 저장된 데이터 불러오기
function loadSavedSchedule() {
    const saved = localStorage.getItem('fireStationSchedule');
    if (saved) {
        const savedSchedule = JSON.parse(saved);
        Object.keys(specialSchedules).forEach(key => delete specialSchedules[key]);
        Object.assign(specialSchedules, savedSchedule);
    }
}

// 초기화 함수 수정
const originalInit = document.addEventListener;
document.addEventListener('DOMContentLoaded', function() {
    // 저장된 스케줄 불러오기
    loadSavedSchedule();
    
    // 현재 월 표시
    document.getElementById('currentMonth').textContent = 
        `${currentYear}년 ${currentMonth + 1}월`;
    
    // 각 부서별 날짜 헤더 생성
    createDateHeaders('center');
    createDateHeaders('rescue');
    createDateHeaders('emergency');
    
    // 각 부서별 근무표 생성
    generateSchedule('center');
    generateSchedule('rescue');
    generateSchedule('emergency');
    
    // 통계 생성
    generateStatistics();
});