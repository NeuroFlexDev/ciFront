import { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';
import arrowIcon from '@/assets/icons/common/arrowIcon.svg';

interface DropdownItem {
  id: number | string;
  name: string;
}

interface DropdownProps {
  items: DropdownItem[];
  value?: DropdownItem;
  onChange?: (item: DropdownItem) => void;
  placeholder?: string;
  label?: string;
}

const Select = ({ items, value, onChange, placeholder = 'Select...', label }: DropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DropdownItem | null>(value || null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: DropdownItem) => {
    setSelectedItem(item);
    onChange?.(item);
    setIsOpen(false);
  };

  return (
    <div className={styles.dropdownContainer} ref={dropdownRef}>
      {label && <label className={styles.inputLabel}>{label}</label>}
      <button
        className={`${styles.dropdownToggle} ${isOpen ? styles.isOpen : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
      >
        <span className={styles.dropdownText}>
          {selectedItem ? selectedItem.name : placeholder}
        </span>
          <img
            src={arrowIcon}
            alt="arrow"
            className={styles.arrowIcon}
            style={{ transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)` }}
          />
      </button>

      {isOpen && (
        <ul className={styles.dropdownMenu} role="listbox">
          {items.map((item) => (
            <li
              key={item.id}
              className={`${styles.dropdownItem} ${
                selectedItem?.id === item.id ? styles.selected : ''
              }`}
              onClick={() => handleSelect(item)}
              role="option"
              aria-selected={selectedItem?.id === item.id}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Select;