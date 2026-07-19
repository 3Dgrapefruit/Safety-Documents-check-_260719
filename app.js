// LocalStorage専用動作モード
const employeeItems = [
    "名前", "ふりがな", "職種", "雇入年月日", "生年月日",
    "経験年数", "現住所", "電話番号", "緊急連絡先住所", "緊急連絡先電話",
    "緊急連絡先氏名", "続柄", "血液型",
    "健康診断受診日と血圧", "資格証（写し）", "標準報酬決定通知書（写し）", "雇用保険加入証明（写し）", "顔写真",
    "CCUS　技能者　ID", "CCUS　技能者　４桁のセキュリティコード"
];

const soloOwnerItems = [
    "名前", "ふりがな", "職種", "雇入年月日", "生年月日",
    "経験年数", "郵便番号", "現住所", "電話番号", "緊急連絡先住所", "緊急連絡先電話",
    "緊急連絡先氏名", "続柄", "血液型",
    "健康診断受診日と血圧", "資格証（写し）", "工事請負基本契約書（写し）", "国民健康保険（写し）", "国民年金（写し）", "特別労災保険（写し）", "顔写真",
    "CCUS　事業者　ID", "CCUS　事業者　４桁のセキュリティコード",
    "CCUS　技能者　ID", "CCUS　技能者　４桁のセキュリティコード"
];

const companyItems = [
    "会社名",
    "会社名かな",
    "郵便番号",
    "住所",
    "電話番号",
    "FAX番号",
    "代表者役職名",
    "代表者名",
    "工事請負基本契約書（写し）",
    "建設業許可証（写し）",
    "１０年以上の実務経歴書",
    "社会保険領収書（写し）",
    "雇用保険領収書（写し）",
    "上乗せ保険（写し）",
    "CCUS　事業者　ID",
    "CCUS　事業者　４桁のセキュリティコード"
];

const initApp = async () => {
    const tbody = document.getElementById('checklist-body');
    const generateBtn = document.getElementById('generate-btn');
    const resultSection = document.getElementById('result-section');
    const emailOutput = document.getElementById('email-output');
    const copyBtn = document.getElementById('copy-btn');
    const toast = document.getElementById('copy-toast');
    const checkAllBtn = document.getElementById('check-all-received');
    const clearAllBtn = document.getElementById('clear-all');

    const tabEmployee = document.getElementById('tab-employee');
    const tabSolo = document.getElementById('tab-solo');
    const tabCompany = document.getElementById('tab-company');
    const workerNameInput = document.getElementById('worker-name');
    const companyNameInput = document.getElementById('company-name');

    let activeTab = 'employee';
    let receivedCheckboxes = [];
    let notReqCheckboxes = [];
    
    const STORAGE_KEY = 'safetyDocChecklist';
    let safetyDocCache = {};

    const fetchAllData = () => {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
            let migrated = false;
            
            // Migrate old structure to new structure
            Object.keys(raw).forEach(companyName => {
                const companyData = raw[companyName];
                if (companyData && typeof companyData === 'object' && !('companyDocs' in companyData) && !('workers' in companyData)) {
                    const oldWorkers = { ...companyData };
                    raw[companyName] = {
                        companyDocs: { 
                            received: new Array(companyItems.length).fill(false)
                        },
                        workers: oldWorkers
                    };
                    migrated = true;
                }
            });
            
            if (migrated) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
            }
            safetyDocCache = raw;
        } catch {
            safetyDocCache = {};
        }
    };

    // Setup mutually exclusive checkboxes and row styling
    const updateRowStyle = (row, isReceived) => {
        if (isReceived) {
            row.classList.add('completed');
        } else {
            row.classList.remove('completed');
        }
    };

    const toggleExpDocRow = (hide) => {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach(tr => {
            const nameTd = tr.querySelector('.col-name');
            if (nameTd && nameTd.textContent.trim() === '１０年以上の実務経歴書') {
                if (hide) {
                    tr.style.display = 'none';
                    const rec = tr.querySelector('.cb-received');
                    if (rec) rec.checked = false;
                } else {
                    tr.style.display = '';
                }
            }
        });
    };

    const setupCheckboxListeners = () => {
        receivedCheckboxes = document.querySelectorAll('.cb-received');
        const licenseNoneCb = document.querySelector('.cb-license-none');

        receivedCheckboxes.forEach((cb) => {
            cb.addEventListener('change', (e) => {
                const tr = e.target.closest('tr');
                updateRowStyle(tr, e.target.checked);
                if (e.target.dataset.name === '建設業許可証（写し）' && e.target.checked && licenseNoneCb) {
                    licenseNoneCb.checked = false;
                    toggleExpDocRow(false);
                }
            });
        });

        if (licenseNoneCb) {
            licenseNoneCb.addEventListener('change', (e) => {
                const isNone = e.target.checked;
                const tr = e.target.closest('tr');
                const recCb = tr.querySelector('.cb-received');
                if (isNone && recCb) {
                    recCb.checked = false;
                    updateRowStyle(tr, false);
                }
                toggleExpDocRow(isNone);
            });
        }
    };

    // Render checklist items based on active tab
    const renderTable = () => {
        tbody.innerHTML = '';
        let currentItems;
        if (activeTab === 'employee') {
            currentItems = employeeItems;
        } else if (activeTab === 'solo') {
            currentItems = soloOwnerItems;
        } else {
            currentItems = companyItems;
        }
        currentItems.forEach((item, index) => {
            const id = index + 1;
            const tr = document.createElement('tr');
            tr.className = 'item-row';
            tr.dataset.id = id;

            const isLicenseRow = (activeTab === 'company' && item === '建設業許可証（写し）');

            tr.innerHTML = `
                <td class="text-center">${id}</td>
                <td class="col-name">${item}</td>
                <td class="col-status text-center">
                    <div class="checkbox-cell-wrapper">
                        <label class="custom-checkbox" title="チェック">
                            <input type="checkbox" class="cb-received" data-index="${index}" data-name="${item}">
                            <span class="checkmark"></span>
                        </label>
                        ${isLicenseRow ? `
                        <label class="custom-round-checkbox-badge" title="なし">
                            <span class="round-label-top">なし</span>
                            <input type="checkbox" class="cb-license-none" data-index="${index}">
                            <span class="round-checkmark"></span>
                        </label>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupCheckboxListeners();
    };

    const switchTab = (tab) => {
        activeTab = tab;

        // タブの active クラスの切り替え
        tabEmployee.classList.remove('active');
        tabSolo.classList.remove('active');
        tabCompany.classList.remove('active');

        if (activeTab === 'employee') {
            tabEmployee.classList.add('active');
            companyNameInput.placeholder = "例: 株式会社〇〇建設（スペースなし）";
            workerNameInput.removeAttribute('disabled');
            workerNameInput.placeholder = "例: 山田　太郎（姓と名の間に全角スペース）";
        } else if (activeTab === 'solo') {
            tabSolo.classList.add('active');
            companyNameInput.placeholder = "例: 屋号または氏名";
            workerNameInput.removeAttribute('disabled');
            workerNameInput.placeholder = "例: 山田　太郎（姓と名の間に全角スペース）";
        } else {
            tabCompany.classList.add('active');
            companyNameInput.placeholder = "例: 株式会社〇〇建設（スペースなし）";
            workerNameInput.setAttribute('disabled', 'true');
            workerNameInput.placeholder = "会社書類のため入力不要";
            workerNameInput.value = '';
        }

        renderTable();
    };

    const clearCheckboxes = () => {
        receivedCheckboxes.forEach((cb) => {
            cb.checked = false;
            const tr = cb.closest('tr');
            updateRowStyle(tr, false);
        });
    };

    const handleWorkerNameChange = () => {
        const compName = companyNameInput.value.trim() || '未分類の会社';
        const wName = workerNameInput.value.trim();

        document.querySelectorAll('.sidebar-worker-item').forEach(item => item.classList.remove('active'));

        if (!wName) {
            clearCheckboxes();
            return;
        }

        if (safetyDocCache[compName] && safetyDocCache[compName].workers && safetyDocCache[compName].workers[wName]) {
            const workerData = safetyDocCache[compName].workers[wName];
            const recData = workerData.received || [];
            
            receivedCheckboxes.forEach((cb, i) => {
                cb.checked = recData[i] || false;
                const tr = cb.closest('tr');
                updateRowStyle(tr, cb.checked);
            });
        } else {
            clearCheckboxes();
        }
    };

    const handleCompanyNameChange = () => {
        const compName = companyNameInput.value.trim();
        
        document.querySelectorAll('.sidebar-worker-item').forEach(item => item.classList.remove('active'));

        if (activeTab === 'company') {
            if (compName && safetyDocCache[compName] && safetyDocCache[compName].companyDocs) {
                const compDocs = safetyDocCache[compName].companyDocs;
                const recData = compDocs.received || [];
                receivedCheckboxes.forEach((cb, i) => {
                    cb.checked = recData[i] || false;
                    const tr = cb.closest('tr');
                    updateRowStyle(tr, cb.checked);
                });
            } else {
                clearCheckboxes();
            }
        } else {
            workerNameInput.value = '';
            clearCheckboxes();
        }
    };

    workerNameInput.addEventListener('input', handleWorkerNameChange);
    workerNameInput.addEventListener('change', handleWorkerNameChange);
    companyNameInput.addEventListener('input', handleCompanyNameChange);
    companyNameInput.addEventListener('change', handleCompanyNameChange);

    tabEmployee.addEventListener('click', () => switchTab('employee'));
    tabSolo.addEventListener('click', () => switchTab('solo'));
    tabCompany.addEventListener('click', () => switchTab('company'));

    // Initial render (Synchronous)
    fetchAllData();
    renderTable();

    // Bulk actions
    checkAllBtn.addEventListener('click', () => {
        receivedCheckboxes.forEach((cb) => {
            const tr = cb.closest('tr');
            if (tr && tr.style.display !== 'none') {
                cb.checked = true;
                updateRowStyle(tr, true);
            }
        });
        const licenseNoneCb = document.querySelector('.cb-license-none');
        if (licenseNoneCb) licenseNoneCb.checked = false;
    });

    clearAllBtn.addEventListener('click', () => {
        receivedCheckboxes.forEach((cb) => {
            cb.checked = false;
            const tr = cb.closest('tr');
            updateRowStyle(tr, false);
        });
        const licenseNoneCb = document.querySelector('.cb-license-none');
        if (licenseNoneCb) {
            licenseNoneCb.checked = false;
            toggleExpDocRow(false);
        }
    });

    // Generate Email
    generateBtn.addEventListener('click', async () => {
        const companyName = companyNameInput.value.trim() || '未分類の会社';
        const workerName = workerNameInput.value.trim();
        
        // 1. 自動保存の実行（名前が入力されている、または会社書類タブの場合のみ）
        if (companyName !== '未分類の会社' && (activeTab === 'company' || workerName)) {
            await saveCurrentState(false);
        }

        // 2. データの再ロードと収集
        const data = loadSavedData();
        const companyData = data[companyName];
        
        let companyMissingItems = [];
        let workersMissingMap = {};
        
        if (companyData) {
            // 会社の中の作業員構成をチェック（一人親方のみの場合は会社書類不要）
            let hasEmployee = false;
            let hasSolo = false;
            if (companyData.workers) {
                const workersList = Object.values(companyData.workers);
                hasEmployee = workersList.some(w => (w.type || 'employee') === 'employee');
                hasSolo = workersList.some(w => w.type === 'solo');
            }
            const isSoloOnlyCompany = hasSolo && !hasEmployee;

            // 会社書類の不足チェック (一人親方のみ所属する会社の場合はスキップ)
            if (companyData.companyDocs && !isSoloOnlyCompany) {
                companyItems.forEach((item, i) => {
                    const rec = companyData.companyDocs.received[i];
                    const not = companyData.companyDocs.notReq[i];
                    if (!rec && !not) {
                        companyMissingItems.push(item);
                    }
                });
            }
            
            // 各作業員の不足チェック
            if (companyData.workers) {
                Object.keys(companyData.workers).forEach(wName => {
                    const wData = companyData.workers[wName];
                    const wType = wData.type || 'employee';
                    const currentWorkerItems = wType === 'solo' ? soloOwnerItems : employeeItems;
                    
                    let wMissing = [];
                    currentWorkerItems.forEach((item, i) => {
                        const rec = wData.received[i];
                        const not = wData.notReq[i];
                        if (!rec && !not) {
                            wMissing.push(item);
                        }
                    });
                    if (wMissing.length > 0) {
                        workersMissingMap[wName] = wMissing;
                    }
                });
            }
        } else {
            // 保存データが無い場合（フォールバック：現在の画面上の未提出のみを反映）
            if (activeTab === 'company') {
                receivedCheckboxes.forEach((cb, i) => {
                    if (!cb.checked && !notReqCheckboxes[i].checked) {
                        companyMissingItems.push(cb.dataset.name);
                    }
                });
            } else if (workerName) {
                let wMissing = [];
                receivedCheckboxes.forEach((cb, i) => {
                    if (!cb.checked && !notReqCheckboxes[i].checked) {
                        wMissing.push(cb.dataset.name);
                    }
                });
                if (wMissing.length > 0) {
                    workersMissingMap[workerName] = wMissing;
                }
            }
        }

        // 3. メール文面の構築
        let emailText = '';
        const hasCompanyMissing = companyMissingItems.length > 0;
        const missingWorkers = Object.keys(workersMissingMap);
        const hasWorkersMissing = missingWorkers.length > 0;
        
        if (!hasCompanyMissing && !hasWorkersMissing) {
            emailText = `${companyName}
安全書類ご担当者様

いつもお世話になっております。

提出用の安全書類がすべてそろいました。
ご協力をありがとうございました。`;
        } else {
            emailText = `${companyName}
安全書類ご担当者様

いつもお世話になっております。
安全書類の整備にあたり、以下の書類が未提出となっております。
お忙しいところ、お手数をおかけいたしますが、ご確認のうえ、ご提出をお願いいたします。
`;

            if (hasCompanyMissing) {
                const missingText = companyMissingItems.map(item => `□ ${item}`).join('\n');
                emailText += `
【会社書類】
${missingText}
`;
            }

            if (hasWorkersMissing) {
                missingWorkers.forEach(wName => {
                    const missingText = workersMissingMap[wName].map(item => `□ ${item}`).join('\n');
                    emailText += `
【${wName} 様】
${missingText}
`;
                });
            }
        }

        emailOutput.value = emailText;
        resultSection.style.display = 'block';
        
        // Scroll to result
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', () => {
        emailOutput.select();
        document.execCommand('copy');
        
        // Show toast
        toast.textContent = 'コピーしました！';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    });

    // --- Save Feature Logic ---
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebarList = document.getElementById('sidebar-list');

    const loadSavedData = () => {
        return safetyDocCache;
    };

    const updateCompanyDatalist = () => {
        const companyList = document.getElementById('company-list');
        if (!companyList) return;
        const data = loadSavedData();
        const companies = Object.keys(data);
        companyList.innerHTML = '';
        companies.forEach(companyName => {
            if (companyName !== '未分類の会社') {
                const option = document.createElement('option');
                option.value = companyName;
                companyList.appendChild(option);
            }
        });
    };

    const renderSidebar = () => {
        const data = loadSavedData();
        sidebarList.innerHTML = '';
        
        const companies = Object.keys(data);
        if (companies.length === 0) {
            sidebarList.innerHTML = '<p class="sidebar-empty">保存されているデータはありません。</p>';
            return;
        }

        companies.forEach(companyName => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'sidebar-company-group';
            
            // 会社ヘッダーと削除ボタンの作成
            const titleContainer = document.createElement('div');
            titleContainer.className = 'sidebar-company-title-container';

            const companyTitle = document.createElement('div');
            companyTitle.className = 'sidebar-company-name';
            companyTitle.textContent = companyName;
            titleContainer.appendChild(companyTitle);

            const deleteCompanyBtn = document.createElement('button');
            deleteCompanyBtn.className = 'btn-delete-company';
            deleteCompanyBtn.title = 'この会社のすべてのデータを削除';
            deleteCompanyBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
            deleteCompanyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`「${companyName}」のデータを完全に削除しますか？\n（所属する作業員のデータもすべて削除されます）`)) {
                    delete safetyDocCache[companyName];
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                    renderSidebar();
                }
            });
            titleContainer.appendChild(deleteCompanyBtn);

            groupDiv.appendChild(titleContainer);
            
            const ul = document.createElement('ul');
            ul.className = 'sidebar-worker-list';
            
            const companyDocs = data[companyName].companyDocs || { received: [], notReq: [] };
            const workers = data[companyName].workers || {};

            // Calculate company document missing count
            let companyMissingCount = 0;
            companyItems.forEach((_, i) => {
                const rec = companyDocs.received[i];
                const not = companyDocs.notReq[i];
                if (!rec && !not) companyMissingCount++;
            });

            // 1. Render Company Docs Item (一人親方のみ登録の場合は会社書類を表示しない)
            const workersList = Object.values(workers);
            const hasEmployee = workersList.some(w => (w.type || 'employee') === 'employee');
            const hasSolo = workersList.some(w => w.type === 'solo');
            const isSoloOnlyCompany = hasSolo && !hasEmployee;

            if (!isSoloOnlyCompany) {
                const liCompany = document.createElement('li');
                liCompany.className = 'sidebar-worker-item sidebar-company-doc-item';
                liCompany.innerHTML = `
                    <span><i class="fa-solid fa-building"></i> 会社書類</span>
                    <span class="sidebar-item-right">
                        <span class="badge" style="${companyMissingCount === 0 ? 'background: var(--secondary);' : ''}">残り ${companyMissingCount}</span>
                        <button class="btn-delete-item" title="会社書類データをクリア"><i class="fa-solid fa-trash-can"></i></button>
                    </span>
                `;
                
                liCompany.addEventListener('click', () => {
                    document.querySelectorAll('.sidebar-worker-item').forEach(item => item.classList.remove('active'));
                    liCompany.classList.add('active');

                    companyNameInput.value = companyName !== '未分類の会社' ? companyName : '';
                    switchTab('company');
                    
                    const recData = companyDocs.received || [];
                    const notReqData = companyDocs.notReq || [];
                    
                    receivedCheckboxes.forEach((cb, i) => {
                        cb.checked = recData[i] || false;
                        const tr = cb.closest('tr');
                        const notReqCb = tr ? tr.querySelector('.cb-notreq') : null;
                        if (notReqCb) notReqCb.checked = notReqData[i] || false;
                        updateRowStyle(tr, cb.checked, notReqCb ? notReqCb.checked : false);
                    });
                });

                // 会社書類の削除（クリア）ハンドラ
                const deleteCompanyDocsBtn = liCompany.querySelector('.btn-delete-item');
                deleteCompanyDocsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`「${companyName}」の会社書類データを保存リストから削除しますか？`)) {
                        if (safetyDocCache[companyName]) {
                            safetyDocCache[companyName].companyDocs = {
                                received: new Array(companyItems.length).fill(false),
                                notReq: new Array(companyItems.length).fill(false)
                            };
                            
                            const workersCount = Object.keys(safetyDocCache[companyName].workers || {}).length;
                            if (workersCount === 0) {
                                delete safetyDocCache[companyName];
                            }
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                            renderSidebar();
                        }
                    }
                });

                ul.appendChild(liCompany);
            }
            
            // 2. Render Workers Items
            Object.keys(workers).forEach(workerName => {
                const li = document.createElement('li');
                li.className = 'sidebar-worker-item';
                
                const workerData = workers[workerName];
                const workerType = workerData.type || 'employee';
                const currentWorkerItems = workerType === 'solo' ? soloOwnerItems : employeeItems;
                
                let workerMissingCount = 0;
                currentWorkerItems.forEach((_, i) => {
                    const rec = workerData.received[i];
                    const not = workerData.notReq[i];
                    if (!rec && !not) workerMissingCount++;
                });

                li.innerHTML = `
                    <span><i class="fa-solid fa-user"></i> ${workerName}</span>
                    <span class="sidebar-item-right">
                        <span class="badge" style="${workerMissingCount === 0 ? 'background: var(--secondary);' : ''}">残り ${workerMissingCount}</span>
                        <button class="btn-delete-item" title="作業員データを削除"><i class="fa-solid fa-trash-can"></i></button>
                    </span>
                `;
                
                li.addEventListener('click', () => {
                    document.querySelectorAll('.sidebar-worker-item').forEach(item => item.classList.remove('active'));
                    li.classList.add('active');

                    companyNameInput.value = companyName !== '未分類の会社' ? companyName : '';
                    workerNameInput.value = workerName !== '名前未入力' ? workerName : '';
                    switchTab(workerType);
                    
                    receivedCheckboxes.forEach((cb, i) => {
                        cb.checked = workerData.received[i] || false;
                        const tr = cb.closest('tr');
                        const notReqCb = tr ? tr.querySelector('.cb-notreq') : null;
                        if (notReqCb) notReqCb.checked = workerData.notReq[i] || false;
                        updateRowStyle(tr, cb.checked, notReqCb ? notReqCb.checked : false);
                    });
                });

                // 作業員の個別削除ハンドラ
                const deleteWorkerBtn = li.querySelector('.btn-delete-item');
                deleteWorkerBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`「${companyName}」の ${workerName} 様のデータを保存リストから完全に削除しますか？`)) {
                        if (safetyDocCache[companyName] && safetyDocCache[companyName].workers) {
                            delete safetyDocCache[companyName].workers[workerName];
                            
                            const workersCount = Object.keys(safetyDocCache[companyName].workers).length;
                            const compDocs = safetyDocCache[companyName].companyDocs;
                            let isCompDocsEmpty = true;
                            if (compDocs && compDocs.received) {
                                compDocs.received.forEach((rec, i) => {
                                    if (rec || compDocs.notReq[i]) isCompDocsEmpty = false;
                                });
                            }
                            
                            if (workersCount === 0 && isCompDocsEmpty) {
                                delete safetyDocCache[companyName];
                            }
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                            renderSidebar();
                        }
                    }
                });
                
                ul.appendChild(li);
            });
            
            groupDiv.appendChild(ul);
            sidebarList.appendChild(groupDiv);
        });
        updateCompanyDatalist();
    };

    renderSidebar();

    openSidebarBtn.addEventListener('click', () => sidebar.classList.add('open'));
    closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    
    const closeSidebarBottomBtn = document.getElementById('close-sidebar-bottom');
    if (closeSidebarBottomBtn) {
        closeSidebarBottomBtn.addEventListener('click', () => sidebar.classList.remove('open'));
    }

    const saveCurrentState = async (showFeedback = true) => {
        const companyName = companyNameInput.value.trim() || '未分類の会社';
        
        const received = Array.from(receivedCheckboxes).map(cb => cb.checked);
        const notReq = Array.from(notReqCheckboxes).map(cb => cb.checked);
        
        let isAllComplete = true;
        received.forEach((rec, i) => {
            if (!rec && !notReq[i]) {
                isAllComplete = false;
            }
        });

        if (!safetyDocCache[companyName]) {
            safetyDocCache[companyName] = {
                companyDocs: { 
                    received: new Array(companyItems.length).fill(false), 
                    notReq: new Array(companyItems.length).fill(false) 
                },
                workers: {}
            };
        }

        let isDeleted = false;

        if (activeTab === 'employee' || activeTab === 'solo') {
            const workerName = workerNameInput.value.trim();
            if (!workerName) {
                if (showFeedback) alert('作業員名を入力してください。');
                return false;
            }
            
            if (isAllComplete) {
                if (safetyDocCache[companyName].workers && safetyDocCache[companyName].workers[workerName]) {
                    delete safetyDocCache[companyName].workers[workerName];
                    
                    const workersCount = Object.keys(safetyDocCache[companyName].workers).length;
                    const compDocs = safetyDocCache[companyName].companyDocs;
                    let isCompDocsComplete = true;
                    if (compDocs && compDocs.received) {
                        compDocs.received.forEach((rec, i) => {
                            if (!rec && !compDocs.notReq[i]) isCompDocsComplete = false;
                        });
                    }
                    
                    if (workersCount === 0 && isCompDocsComplete) {
                        delete safetyDocCache[companyName];
                        isDeleted = true;
                    }
                    if (showFeedback) alert('すべての項目が完了しているため、作業員を保存リストから削除しました。');
                } else {
                    if (showFeedback) alert('すでに全項目が完了しています。（保存不要）');
                    return true;
                }
            } else {
                let totalWorkers = 0;
                Object.values(safetyDocCache).forEach(cData => {
                    if (cData.workers) {
                        totalWorkers += Object.keys(cData.workers).length;
                    }
                });
                
                const isNewWorker = !safetyDocCache[companyName].workers[workerName];
                
                if (isNewWorker && totalWorkers >= 30) {
                    if (showFeedback) alert('保存上限（30名）に達しています。新しく保存するには、完了した人をリストから消すか、別のブラウザを利用してください。');
                    return false;
                }
                
                safetyDocCache[companyName].workers[workerName] = { 
                    type: activeTab,
                    received, 
                    notReq 
                };
            }
        } else {
            // activeTab === 'company'
            safetyDocCache[companyName].companyDocs = { received, notReq };
        }

        // LocalStorage mode save
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
        renderSidebar();
        if (showFeedback) {
            toast.textContent = '状態を保存しました！';
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }
        return true;
    };

    // Initial load and render
    fetchAllData();
    renderSidebar();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
