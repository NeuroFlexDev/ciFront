import React, { useState, useMemo } from 'react';
import searchIcon from '@/assets/icons/course/search.svg';
import styles from './assignModal.module.css';

export interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  avatar: string | null;
  assignedCourses: number;
}

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (selectedIds: number[]) => void;
  employees: Employee[];
}

const departments = [
  { label: 'Все', key: 'all' },
  { label: 'Продажи', key: 'sales' },
  { label: 'Поддержка', key: 'support' },
  { label: 'Маркетинг', key: 'marketing' },
  { label: 'Разработка', key: 'development' },
];

const AssignModal: React.FC<AssignModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  employees,
}) => {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        search.trim() === '' ||
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.position.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === 'all' || emp.department === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [employees, search, activeFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: employees.length };
    employees.forEach((emp) => {
      c[emp.department] = (c[emp.department] || 0) + 1;
    });
    return c;
  }, [employees]);

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAssign = () => {
    onAssign(Array.from(selected));
    setSelected(new Set());
    setSearch('');
    setActiveFilter('all');
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch('');
    setActiveFilter('all');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Search */}
        <div className={styles.searchWrapper}>
          <img src={searchIcon} alt='Поиск' className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Введите данные сотрудника или должность..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          {departments.map((dept) => (
            <button
              key={dept.key}
              type="button"
              className={`${styles.filterChip} ${
                activeFilter === dept.key ? styles.filterChipActive : ''
              }`}
              onClick={() => setActiveFilter(dept.key)}
            >
              {dept.label}{' '}
              {counts[dept.key] !== undefined && counts[dept.key]}
            </button>
          ))}
        </div>

        <div className={styles.employeeGrid}>
          {filteredEmployees.map((emp) => {
            const isSelected = selected.has(emp.id);
            return (
              <div
                key={emp.id}
                className={`${styles.employeeCard} ${
                  isSelected ? styles.employeeCardSelected : ''
                }`}
                onClick={() => toggleSelect(emp.id)}
              >
                <button
                  type="button"
                  className={`${styles.checkButton} ${
                    isSelected ? styles.checkButtonActive : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(emp.id);
                  }}
                  aria-label={`Выбрать ${emp.name}`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isSelected ? '#C6F135' : '#888'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>

                <div className={styles.employeeAvatar}>
                  {emp.avatar ? (<img src={emp.avatar} alt={emp.name} />) : (
                    <div className={styles.avatarPlaceholder}></div>
                  )}
                </div>

                <div className={styles.employeeInfo}>
                  <span className={styles.employeeName}>{emp.name}</span>
                  <span className={styles.employeePosition}>
                    {emp.position}
                  </span>
                  <span className={styles.employeeCourses}>
                    Назначено {emp.assignedCourses} курсов
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={styles.assignButton}
            onClick={handleAssign}
            disabled={selected.size === 0}
          >
            Назначить
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignModal;