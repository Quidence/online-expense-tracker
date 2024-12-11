$(document).ready(function () {
    // Инициализация состояний сортировки
    document.getElementById('nr-date').valueAsDate = new Date();

    let records = [];

    var r = document.querySelector('*')
    r.style.setProperty("--add-record-opacity", "0")
    r.style.setProperty("--add-record-clickable", "none")
    
    function hideAdd(){
        r.style.setProperty("--add-record-opacity", "0")
        r.style.setProperty("--add-record-clickable", "none")
    }
    
    function showAdd(){
        r.style.setProperty("--add-record-opacity", "100")
        r.style.setProperty("--add-record-clickable", "all")
    }

    function loadData(id) {
        if(id){
            return $.post(".", {
                isGetOne: true,
                id: id
            }, (data) => {
                data = JSON.parse(data)
                console.log(data)
                data["error"] !== undefined ? alert(data["error"]) : records = records.concat(data['record'])
            })
        } else {
            return $.post(".", {
                isGetAll: true
            },  (data) => {
                data = JSON.parse(data)
                console.log(data)
                data["error"] !== undefined ? alert(data["error"]) : records = records.concat(data['records'])
                console.log(records, data["records"])
            })
        }
    }

    function populateContainer(data) {
        const container = document.getElementById("expence-list");
        container.innerHTML = "";
        createCharts(records)
    
        data.forEach(item => {
            // Создаем элемент expence
            const expence = document.createElement("div");
            expence.classList.add("expence");
    
            // Создаем элементы ex-dataholder
            expence.innerHTML = `
                <div class="ex-dataholder" id="ex-date-${item.id}">${item._date}</div>
                <div class="ex-dataholder" id="ex-place-${item.id}">${item.place}</div>
                <div class="ex-dataholder" id="ex-category-${item.id}">${item.category}</div>
                <div class="ex-dataholder" id="ex-name-${item.id}">${item.caption}</div>
                <div class="ex-dataholder" id="ex-value-${item.id}">${item.val}</div>
            `;
    
            // Добавляем expence в контейнер
            container.appendChild(expence);
        });
    }

    function sortTable(data, sortKey, sortDirection = "asc") {
        if (!Array.isArray(data) || data.length === 0) {
            console.error("Данные должны быть массивом с элементами.");
            return data;
        }
    
        if (!["asc", "desc"].includes(sortDirection)) {
            console.error("Направление сортировки должно быть 'asc' или 'desc'.");
            return data;
        }
    
        // Копируем массив, чтобы не изменять оригинал
        const sortedData = [...data];
    
        // Сортируем массив
        sortedData.sort((a, b) => {
            if (!(sortKey in a) || !(sortKey in b)) {
                console.error(`Ключ '${sortKey}' не найден в элементах массива.`);
                return 0;
            }
    
            let valueA = a[sortKey];
            let valueB = b[sortKey];
    
            // Преобразование строковых чисел в числа
            if (sortKey === "val") {
                valueA = parseFloat(valueA);
                valueB = parseFloat(valueB);
            }
    
            if (typeof valueA === "number" && typeof valueB === "number") {
                return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
            } else {
                const comparison = String(valueA).localeCompare(String(valueB), undefined, { numeric: true });
                return sortDirection === "asc" ? comparison : -comparison;
            }
        });
    
        return sortedData;
    }

    function arrayToCSV(data) {
        if (!data.length) return '';
    
        // Извлекаем заголовки (ключи объектов)
        const headers = Object.keys(data[0]);
    
        // Создаем строки CSV
        const rows = data.map(row => 
            headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')
        );
    
        // Возвращаем итоговый CSV
        return [headers.join(','), ...rows].join('\n');
    }
    
    // Функция для сохранения CSV-файла
    function saveCSVFile(csvContent, filename = 'data.csv') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
    
        if (navigator.msSaveBlob) { // Для IE 10+
            navigator.msSaveBlob(blob, filename);
        } else {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    function filterByInput() {

        const value = $("#ex-name-filter").val().trim().toLowerCase()
        if (value === "") {
            populateContainer(records); // Если поле пустое, возвращаем все записи
            return;
        }

        // Фильтрация
        const filteredRecords = records.filter(record => {
            const captionMatch = record.caption.toLowerCase().includes(value);
            const exactCategoryMatch = record.category.toLowerCase() === value;
            const exactPlaceMatch = record.place.toLowerCase() === value;

            // При точном совпадении по category или place игнорируем caption
            if (exactCategoryMatch || exactPlaceMatch) {
                return true;
            }

            return captionMatch;
        });

        // Обновляем контейнер
        populateContainer(filteredRecords);
    }

    function createCharts(data) {
        console.log("fdsdfsdf")
        // Гистограмма по датам (расходы и доходы)
        const dateHistogramData = data.reduce((acc, record) => {
            const date = record._date;
            const value = parseFloat(record.val);
    
            if (!acc[date]) {
                acc[date] = { expenses: 0, income: 0 };
            }
    
            if (value < 0) {
                acc[date].expenses += Math.abs(value);  // Расходы
            } else {
                acc[date].income += value;  // Доходы
            }
    
            return acc;
        }, {});
    
        const dates = Object.keys(dateHistogramData);
        const expenses = dates.map(date => dateHistogramData[date].expenses);
        const income = dates.map(date => dateHistogramData[date].income);
    
        const histogramLayout = {
            barmode: 'stack',
            title: 'Расходы и Доходы по датам',
            xaxis: { title: 'Дата' },
            yaxis: { title: 'Сумма' }
        };
    
        const histogram = {
            x: dates,
            y: expenses,
            name: 'Расходы',
            type: 'bar'
        };
    
        const incomeGraph = {
            x: dates,
            y: income,
            name: 'Доходы',
            type: 'bar'
        };
    
        const histogramData = [histogram, incomeGraph];
    
        // Круговая диаграмма по категориям
        const categoryData = data.reduce((acc, record) => {
            const category = record.category;
            const value = parseFloat(record.val);
    
            if (!acc[category]) {
                acc[category] = 0;
            }
    
            if (value < 0) {
                acc[category] += Math.abs(value);  // Расходы
            }
    
            return acc;
        }, {});
    
        const categories = Object.keys(categoryData);
        const amounts = categories.map(category => categoryData[category]);
    
        const pieChartLayout = {
            title: 'Суммарные траты по категориям'
        };
    
        const pieChart = {
            labels: categories,
            values: amounts,
            type: 'pie'
        };
    
        // Отображение графиков с помощью Plotly
        Plotly.newPlot('date-histogram', histogramData, histogramLayout);
        Plotly.newPlot('category-pie', [pieChart], pieChartLayout);
    }

    loadData().then(() => {
        populateContainer(records)
        
    })

    setTimeout(() => {
        $("#add-record").show()
    }, 300)

    

    let currentSortColumn = null;
    
    $('.ex-filter').on('click', function () {
        const $this = $(this);

        // Если это другой заголовок, сбрасываем стиль текущего
        if (currentSortColumn && currentSortColumn[0] !== $this[0]) {
            currentSortColumn.removeClass('sort-asc sort-desc').addClass('sort-def');
            currentSortColumn = $this; // Обновляем текущий заголовок
        }

        // Переключение состояний
        if ($this.hasClass('sort-def')) {
            $this.removeClass('sort-def').addClass('sort-asc');
        } else if ($this.hasClass('sort-asc')) {
            $this.removeClass('sort-asc').addClass('sort-desc');
        } else if ($this.hasClass('sort-desc')) {
            $this.removeClass('sort-desc').addClass('sort-def');
        }

        // Сохраняем текущий заголовок
        currentSortColumn = $this;

        // Определяем направление сортировки
        const sortDirection = $this.hasClass('sort-asc') ? 'asc' :
                              $this.hasClass('sort-desc') ? 'desc' : null;

        // Выполняем сортировку таблицы
        const sortKey = $this.data("sort");
        if (sortDirection) {
            records = sortTable(records, sortKey, sortDirection);
            filterByInput()
        }
    });

    

    $("#exit-btn").on("click", () => {
        $.post(".", {
            isExit: true
        }, () => {
            document.location.reload()
        })
    })
    
    $("#show-add-btn").on("click", () => {
        showAdd();
    })
    
    $("#cancel-record-btn").on("click", () => {
        hideAdd();
    })

    

    $("#add-record-btn").on("click", () => {
        $.post(".", {
            "isAddRecord": true,
            "val": $("#nr-val").val(),
            "category": $("#nr-category").val(),
            "place": $("#nr-place").val(),
            "caption": $("#nr-caption").val(),
            "_date": $("#nr-date").val()
        }, (data) => {
            data = JSON.parse(data)
            if(data["error"]){
                alert(data[error])
            } else {
                loadData(Number(data["record_id"]))
                populateContainer()
                hideAdd()
            }
        })
    })

    $("#export-to-csv").on("click", () => {
        saveCSVFile(arrayToCSV(records))
    })

    let timer;
    const delay = 1000;

    $('#ex-name-filter').on('input', function () {
        clearTimeout(timer);
        timer = setTimeout(filterByInput, delay);
    });
});


