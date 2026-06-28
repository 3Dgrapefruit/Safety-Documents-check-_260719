// Supabaseクライアントの初期設定と安全な接続確認
let supabaseClient = null;
let useSupabase = false;

if (
    typeof supabase !== 'undefined' && 
    typeof SUPABASE_URL !== 'undefined' && 
    typeof SUPABASE_ANON_KEY !== 'undefined' &&
    SUPABASE_URL && 
    SUPABASE_ANON_KEY
) {
    try {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        useSupabase = true;
        console.log('Supabase mode active.');
    } catch (e) {
        console.error('Failed to initialize Supabase client:', e);
    }
}

if (!useSupabase) {
    console.log('LocalStorage mode active (Supabase not configured).');
}

const employeeItems = [
    "名前", "ふりがな", "職種", "雇入年月日", "生年月日",
    "経験年数", "現住所", "電話番号", "緊急連絡先住所", "緊急連絡先電話",
    "緊急連絡先氏名", "続柄", "血圧上", "血圧下", "血液型",
    "健康診断受診日", "資格証写し", "標準報酬決定通知書写し", "雇用保険加入証明写し", "顔写真",
    "CCUS　技能者ID", "CCUS　4ケタのセキュリティコード", "10年以上の実務経験"
];

const soloOwnerItems = [
    "名前", "ふりがな", "職種", "雇入年月日", "生年月日",
    "経験年数", "現住所", "電話番号", "緊急連絡先住所", "緊急連絡先電話",
    "緊急連絡先氏名", "続柄", "血圧上", "血圧下", "血液型",
    "健康診断受診日", "資格証写し", "国民年金（写し）", "特別労災保険（写し）", "顔写真",
    "CCUS　技能者ID", "CCUS　4ケタのセキュリティコード",
    "CCUS　事業者ID", "CCUS事業者４桁のセキュリティコード"
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
    "建設業許可証（写し）",
    "工事請負基本契約書（写し）",
    "注文書・請書（写し）",
    "社会保険領収書（写し）",
    "雇用保険領収書（写し）",
    "上乗せ保険（写し）",
    "メールアドレス",
    "従業員数",
    "キャリアアップシステム事業者ID",
    "4ケタのセキュリティコード"
];

document.addEventListener('DOMContentLoaded', async () => {
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

    const fetchAllData = async () => {
        if (useSupabase) {
            try {
                const { data, error } = await supabaseClient
                    .from('safety_documents')
                    .select('*');
                
                if (error) throw error;

                safetyDocCache = {};
                if (data) {
                    data.forEach(row => {
                        safetyDocCache[row.company_name] = row.data;
                    });
                }
            } catch (error) {
                console.error('Failed to fetch data from Supabase:', error);
                alert('データベースからのデータ取得に失敗しました。\nエラー詳細: ' + (error.message || error.details || JSON.stringify(error)));
            }
        } else {
            // LocalStorage mode load
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
                                received: new Array(companyItems.length).fill(false), 
                                notReq: new Array(companyItems.length).fill(false) 
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
        }
    };

    // Setup mutually exclusive checkboxes and row styling
    const updateRowStyle = (row, received, notReq) => {
        if (received) {
            row.classList.add('completed');
            row.classList.remove('not-required');
        } else if (notReq) {
            row.classList.add('not-required');
            row.classList.remove('completed');
        } else {
            row.classList.remove('completed', 'not-required');
        }
    };

    const setupCheckboxListeners = () => {
        receivedCheckboxes = document.querySelectorAll('.cb-received');
        notReqCheckboxes = document.querySelectorAll('.cb-notreq');

        receivedCheckboxes.forEach((cb, i) => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    notReqCheckboxes[i].checked = false;
                }
                updateRowStyle(e.target.closest('tr'), e.target.checked, notReqCheckboxes[i].checked);
            });
        });

        notReqCheckboxes.forEach((cb, i) => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                    receivedCheckboxes[i].checked = false;
                }
                updateRowStyle(e.target.closest('tr'), receivedCheckboxes[i].checked, e.target.checked);
            });
        });
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
            tr.innerHTML = `
                <td class="text-center">${id}</td>
                <td class="col-name">${item}</td>
                <td>
                    <div class="checkbox-group">
                        <label class="custom-checkbox" title="受け取り済み">
                            <input type="checkbox" class="cb-received" data-index="${index}" data-name="${item}">
                            <span class="checkmark"></span>
                        </label>
                        <label class="custom-checkbox not-req" title="不要">
                            <input type="checkbox" class="cb-notreq" data-index="${index}">
                            <span class="checkmark"></span>
                        </label>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setupCheckboxListeners();
    };

    const switchTab = (tab) => {
        if (activeTab === tab) return;
        activeTab = tab;

        // タブの active クラスの切り替え
        tabEmployee.classList.remove('active');
        tabSolo.classList.remove('active');
        tabCompany.classList.remove('active');

        if (activeTab === 'employee') {
            tabEmployee.classList.add('active');
            workerNameInput.removeAttribute('disabled');
            workerNameInput.placeholder = "例: 山田 太郎";
        } else if (activeTab === 'solo') {
            tabSolo.classList.add('active');
            workerNameInput.removeAttribute('disabled');
            workerNameInput.placeholder = "例: 山田 太郎";
        } else {
            tabCompany.classList.add('active');
            workerNameInput.setAttribute('disabled', 'true');
            workerNameInput.placeholder = "会社書類のため入力不要";
            workerNameInput.value = '';
        }

        renderTable();
    };

    tabEmployee.addEventListener('click', () => switchTab('employee'));
    tabSolo.addEventListener('click', () => switchTab('solo'));
    tabCompany.addEventListener('click', () => switchTab('company'));

    // Initial render
    await fetchAllData();
    renderTable();

    // Bulk actions
    checkAllBtn.addEventListener('click', () => {
        receivedCheckboxes.forEach((cb, i) => {
            cb.checked = true;
            notReqCheckboxes[i].checked = false;
            updateRowStyle(cb.closest('tr'), true, false);
        });
    });

    clearAllBtn.addEventListener('click', () => {
        receivedCheckboxes.forEach((cb, i) => {
            cb.checked = false;
            notReqCheckboxes[i].checked = false;
            updateRowStyle(cb.closest('tr'), false, false);
        });
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
            // 会社の中に「一人親方」が含まれているかチェック
            let isSoloOwnerCompany = false;
            if (companyData.workers) {
                isSoloOwnerCompany = Object.values(companyData.workers).some(w => w.type === 'solo');
            }

            // 会社書類の不足チェック (一人親方の会社の場合はスキップ)
            if (companyData.companyDocs && !isSoloOwnerCompany) {
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
    const saveBtn = document.getElementById('save-btn');
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
            deleteCompanyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`「${companyName}」のデータを完全に削除しますか？\n（所属する作業員のデータもすべて削除されます）`)) {
                    if (useSupabase) {
                        try {
                            const { error } = await supabaseClient
                                .from('safety_documents')
                                .delete()
                                .eq('company_name', companyName);
                            if (error) throw error;

                            delete safetyDocCache[companyName];
                            renderSidebar();
                        } catch (error) {
                            console.error('Failed to delete company:', error);
                            alert('データの削除に失敗しました。\nエラー詳細: ' + (error.message || error.details || JSON.stringify(error)));
                        }
                    } else {
                        delete safetyDocCache[companyName];
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                        renderSidebar();
                    }
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

            // 1. Render Company Docs Item
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
                companyNameInput.value = companyName !== '未分類の会社' ? companyName : '';
                switchTab('company');
                
                const recData = companyDocs.received || [];
                const notReqData = companyDocs.notReq || [];
                
                receivedCheckboxes.forEach((cb, i) => {
                    cb.checked = recData[i] || false;
                    notReqCheckboxes[i].checked = notReqData[i] || false;
                    updateRowStyle(cb.closest('tr'), cb.checked, notReqCheckboxes[i].checked);
                });
                
                sidebar.classList.remove('open');
            });

            // 会社書類の削除（クリア）ハンドラ
            const deleteCompanyDocsBtn = liCompany.querySelector('.btn-delete-item');
            deleteCompanyDocsBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm(`「${companyName}」の会社書類データを保存リストから削除しますか？`)) {
                    if (safetyDocCache[companyName]) {
                        safetyDocCache[companyName].companyDocs = {
                            received: new Array(companyItems.length).fill(false),
                            notReq: new Array(companyItems.length).fill(false)
                        };
                        
                        const workersCount = Object.keys(safetyDocCache[companyName].workers || {}).length;
                        
                        if (useSupabase) {
                            try {
                                if (workersCount === 0) {
                                    const { error } = await supabaseClient
                                        .from('safety_documents')
                                        .delete()
                                        .eq('company_name', companyName);
                                    if (error) throw error;
                                    delete safetyDocCache[companyName];
                                } else {
                                    const { error } = await supabaseClient
                                        .from('safety_documents')
                                        .upsert({
                                            company_name: companyName,
                                            data: safetyDocCache[companyName],
                                            user_id: '00000000-0000-0000-0000-000000000000'
                                        }, { onConflict: 'user_id,company_name' });
                                    if (error) throw error;
                                }
                                renderSidebar();
                            } catch (error) {
                                console.error('Failed to clear company docs:', error);
                                alert('会社書類のクリアに失敗しました。\nエラー詳細: ' + (error.message || error.details || JSON.stringify(error)));
                            }
                        } else {
                            if (workersCount === 0) {
                                delete safetyDocCache[companyName];
                            }
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                            renderSidebar();
                        }
                    }
                }
            });

            ul.appendChild(liCompany);
            
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
                    companyNameInput.value = companyName !== '未分類の会社' ? companyName : '';
                    workerNameInput.value = workerName !== '名前未入力' ? workerName : '';
                    switchTab(workerType);
                    
                    receivedCheckboxes.forEach((cb, i) => {
                        cb.checked = workerData.received[i] || false;
                        notReqCheckboxes[i].checked = workerData.notReq[i] || false;
                        updateRowStyle(cb.closest('tr'), cb.checked, notReqCheckboxes[i].checked);
                    });
                    
                    sidebar.classList.remove('open');
                });

                // 作業員の個別削除ハンドラ
                const deleteWorkerBtn = li.querySelector('.btn-delete-item');
                deleteWorkerBtn.addEventListener('click', async (e) => {
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
                            
                            if (useSupabase) {
                                try {
                                    if (workersCount === 0 && isCompDocsEmpty) {
                                        const { error } = await supabaseClient
                                            .from('safety_documents')
                                            .delete()
                                            .eq('company_name', companyName);
                                        if (error) throw error;
                                        delete safetyDocCache[companyName];
                                    } else {
                                        const { error } = await supabaseClient
                                            .from('safety_documents')
                                            .upsert({
                                                company_name: companyName,
                                                data: safetyDocCache[companyName],
                                                user_id: '00000000-0000-0000-0000-000000000000'
                                            }, { onConflict: 'user_id,company_name' });
                                        if (error) throw error;
                                    }
                                    renderSidebar();
                                } catch (error) {
                                    console.error('Failed to delete worker:', error);
                                    alert('作業員データの削除に失敗しました。\nエラー詳細: ' + (error.message || error.details || JSON.stringify(error)));
                                }
                            } else {
                                if (workersCount === 0 && isCompDocsEmpty) {
                                    delete safetyDocCache[companyName];
                                }
                                localStorage.setItem(STORAGE_KEY, JSON.stringify(safetyDocCache));
                                renderSidebar();
                            }
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
                
                if (isNewWorker && totalWorkers >= 20) {
                    if (showFeedback) alert('保存上限（20名）に達しています。新しく保存するには、完了した人をリストから消すか、別のブラウザを利用してください。');
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

        if (useSupabase) {
            try {
                if (isDeleted || (Object.keys(safetyDocCache[companyName]?.workers || {}).length === 0 && 
                    safetyDocCache[companyName]?.companyDocs?.received?.every((rec, i) => rec || safetyDocCache[companyName].companyDocs.notReq[i]))) {
                    const { error } = await supabaseClient
                        .from('safety_documents')
                        .delete()
                        .eq('company_name', companyName);
                    if (error) throw error;
                    delete safetyDocCache[companyName];
                } else {
                    const { error } = await supabaseClient
                        .from('safety_documents')
                        .upsert({
                            company_name: companyName,
                            data: safetyDocCache[companyName],
                            user_id: '00000000-0000-0000-0000-000000000000'
                        }, { onConflict: 'user_id,company_name' });
                    if (error) throw error;
                }

                renderSidebar();
                
                if (showFeedback) {
                    toast.textContent = '状態を保存しました！';
                    toast.classList.add('show');
                    setTimeout(() => {
                        toast.classList.remove('show');
                    }, 3000);
                }
                return true;
            } catch (error) {
                console.error('Failed to save to Supabase:', error);
                alert('データベースへの保存に失敗しました。\nエラー詳細: ' + (error.message || error.details || JSON.stringify(error)));
                await fetchAllData();
                renderSidebar();
                return false;
            }
        } else {
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
        }
    };

    saveBtn.addEventListener('click', async () => {
        await saveCurrentState(true);
    });
});
