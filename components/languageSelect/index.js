import SelectDropdown from 'react-native-select-dropdown';
import  {Ailang} from "./AIAssemblyLanguage"
const Language = ({setActiveLanguage, defaultLang}) => {
  return (
    <SelectDropdown
      data={defaultLang ? Ailang.filter(data=>data.default) : Ailang}
      onSelect={(selectedItem) => {

        setActiveLanguage(selectedItem)
      }}
      buttonTextAfterSelection={(selectedItem, index) => {
        // text represented after item is selected
        // if data array is an array of objects then return selectedItem.property to render after item is selected
        return selectedItem.name;
      }}
      rowTextForSelection={(item, index) => {
        // text represented for each item in dropdown
        // if data array is an array of objects then return item.property to represent item in dropdown
        return item.name;
      }}
    />
  );
};

export default Language;
