<?php

    session_start();

    if ($_SERVER['REQUEST_METHOD'] === 'GET'){
        if (isset($_SESSION['user_id']))
            echo file_get_contents("./static/main.html");
        else
            echo file_get_contents("./static/login.html");
    } else if ($_SERVER["REQUEST_METHOD"] === "POST"){
        $db = new mysqli("localhost", "root", "", "budiak");
        if (isset($_POST['isLogin'])) {
            $login = $_POST['login'] ?? '';
            $password = $_POST['password'] ?? '';
        
            // Проверка входных данных
            if (empty($login) || empty($password)) {
                echo json_encode(['error' => 'Логін та пароль не можуть бути пустими']);
                exit;
            }
        
            // Подготовленный запрос для предотвращения SQL-инъекций
            $stmt = $db->prepare("SELECT id, pass FROM Users WHERE username = ?");
            if (!$stmt) {
                echo json_encode(['error' => 'Помилка створення запиту до БД']);
                exit;
            }
        
            $stmt->bind_param("s", $login);
            $stmt->execute();
            $result = $stmt->get_result();
        
            if ($result && $result->num_rows > 0) {
                $user = $result->fetch_assoc();
        
                // Сравнение пароля
                if (password_verify($password, $user['pass'])) {
                    $_SESSION['user_id'] = $user['id']; // Сохраняем user_id в сессии
                    echo json_encode(['status' => 'success', 'id' => $user['id']]);
                    exit;
                }
            }
        
            echo json_encode(['error' => 'Невірний логін або пароль']);
            exit;
        } else if (isset($_POST['isRegister'])) {
            $login = $_POST['login'] ?? '';
            $password = $_POST['password'] ?? '';
        
            // Проверка входных данных
            if (empty($login) || empty($password)) {
                echo json_encode(['error' => 'Логін та пароль не можуть бути пустими']);
                exit;
            }
        
            // Хеширование пароля
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        
            // Подготовленный запрос для вставки данных
            $stmt = $db->prepare("INSERT INTO Users (username, pass) VALUES (?, ?)");
            if (!$stmt) {
                echo json_encode(['error' => 'Ошибка подготовки запроса']);
                exit;
            }
        
            $stmt->bind_param("ss", $login, $hashedPassword);
            if ($stmt->execute()) {
                $_SESSION['user_id'] = $stmt->insert_id; // Сохраняем ID нового пользователя в сессии
                echo json_encode(['status' => 'success']);
            } else {
                echo json_encode(['error' => 'Ошибка регистрации']);
            }
        
            exit;
        } else if(isset($_POST["isExit"])) {
            session_unset();
            session_destroy();
            echo "succes";
            exit;
        } else if (isset($_POST['isAddRecord']) && isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id']; // ID пользователя из сессии
            $val = $_POST['val'] ?? null;
            $categoryName = $_POST['category'] ?? null;
            $placeName = $_POST['place'] ?? null;
            $caption = $_POST['caption'] ?? null;
            $date = $_POST['_date'] ?? null;
        
            // Проверка входных данных
            if ($val === null || $categoryName === null || $placeName === null || $caption === null || $date === null) {
                echo json_encode(['error' => 'Все поля должны быть заполнены']);
                exit;
            }
        
            if (!is_numeric($val) || $val == 0) {
                echo json_encode(['error' => 'Некорректное значение поля "val"']);
                exit;
            }
        
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                echo json_encode(['error' => 'Некорректный формат даты']);
                exit;
            }
        
            // Функция для получения ID из таблицы или добавления новой записи
            function getOrInsertId($db, $table, $column, $value) {
                // Проверяем, есть ли запись
                $stmt = $db->prepare("SELECT id FROM $table WHERE $column = ?");
                if (!$stmt) {
                    echo json_encode(['error' => "Ошибка подготовки запроса к таблице $table"]);
                    exit;
                }
                $stmt->bind_param("s", $value);
                $stmt->execute();
                $result = $stmt->get_result();
        
                if ($result->num_rows > 0) {
                    $row = $result->fetch_assoc();
                    $stmt->close();
                    return $row['id'];
                }
                $stmt->close();
        
                // Если записи нет, добавляем новую
                $stmt = $db->prepare("INSERT INTO $table ($column) VALUES (?)");
                if (!$stmt) {
                    echo json_encode(['error' => "Ошибка подготовки вставки в таблицу $table"]);
                    exit;
                }
                $stmt->bind_param("s", $value);
                $stmt->execute();
                $newId = $stmt->insert_id;
                $stmt->close();
                return $newId;
            }
        
            // Получаем или создаем ID для category
            $categoryId = getOrInsertId($db, 'Categories', 'cat_name', $categoryName);
        
            // Получаем или создаем ID для place
            $placeId = getOrInsertId($db, 'Places', 'place', $placeName);
        
            // Вставляем запись в таблицу Record
            $stmt = $db->prepare("
                INSERT INTO Record (val, user_id, category, place, caption, _date)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            if (!$stmt) {
                echo json_encode(['error' => 'Ошибка подготовки запроса для таблицы Record']);
                exit;
            }
        
            $stmt->bind_param("diiiss", $val, $userId, $categoryId, $placeId, $caption, $date);
        
            if ($stmt->execute()) {
                echo json_encode(['status' => 'success', 'record_id' => $stmt->insert_id]);
            } else {
                echo json_encode(['error' => 'Ошибка добавления записи']);
            }
        
            $stmt->close();
            exit;
        } else if (isset($_POST['isGetOne']) && isset($_POST['id']) && isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id']; // ID пользователя из сессии
            $recordId = $_POST['id'];
        
            // Проверяем, что ID записи является числом
            if (!is_numeric($recordId)) {
                echo json_encode(['error' => 'Некорректный ID записи']);
                exit;
            }
        
            // Подготовленный запрос для получения одной записи
            $stmt = $db->prepare("
                SELECT r.id, r.val, r.caption, r._date, c.cat_name AS category, p.place 
                FROM Record r
                JOIN Categories c ON r.category = c.id
                JOIN Places p ON r.place = p.id
                WHERE r.id = ? AND r.user_id = ?
            ");
            if (!$stmt) {
                echo json_encode(['error' => 'Ошибка подготовки запроса']);
                exit;
            }
        
            $stmt->bind_param("ii", $recordId, $userId);
            $stmt->execute();
            $result = $stmt->get_result();
        
            if ($result->num_rows > 0) {
                $record = $result->fetch_assoc();
                echo json_encode(['status' => 'success', 'record' => $record]);
            } else {
                echo json_encode(['error' => 'Запись не найдена']);
            }
        
            $stmt->close();
            exit;
        } else if (isset($_POST['isGetAll']) && isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id']; // ID пользователя из сессии
        
            // Подготовленный запрос для получения всех записей пользователя
            $stmt = $db->prepare("
                SELECT r.id, r.val, r.caption, r._date, c.cat_name AS category, p.place 
                FROM Record r
                JOIN Categories c ON r.category = c.id
                JOIN Places p ON r.place = p.id
                WHERE r.user_id = ?
                ORDER BY r._date DESC
            ");
            if (!$stmt) {
                echo json_encode(['error' => 'Ошибка подготовки запроса']);
                exit;
            }
        
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
        
            $records = [];
            while ($row = $result->fetch_assoc()) {
                $records[] = $row;
            }
        
            if (count($records) > 0) {
                echo json_encode(['status' => 'success', 'records' => $records]);
            } else {
                echo json_encode(['status' => 'success', 'records' => []]);
            }
        
            $stmt->close();
            exit;
        }
    }

?>