#include <fstream>
#include <sstream>
#include <string>
#include <iostream>
#include <node_api.h>

napi_value ParseCsv(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc = 1;
  size_t buf_size = 1024;
  size_t csv_path_bytes = 0;
  char csv_path[buf_size];
  napi_value argv[1];
  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);

  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Failed to parse arguments");
  }

  status = napi_get_value_string_utf8(env, argv[0], csv_path, buf_size, &csv_path_bytes);

  if (csv_path_bytes >= buf_size-1) {
    napi_throw_error(env, NULL, "CSV file path too long");
  }

  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Invalid csv file path");
  }

  std::ifstream ifile;
  ifile.open(csv_path);
  if(!ifile) {
      napi_throw_error(env, NULL, "CSV file does not exist at given filepath");
  }
  
  // Stringifying
  std::string return_string = "{Col_labels:[";
  std::string row_labels = ",Row_labels:[";

  std::ifstream  data(csv_path);
  std::string line;

  std::getline(data,line);
  std::stringstream  lineStream(line);
  std::string        cell;

  std::getline(lineStream,cell,',');
  std::getline(lineStream,cell);
  cell.pop_back();
  return_string.append(cell);
  return_string.append("],Data:[");

  while(std::getline(data,line))
  {
      std::stringstream  lineStream(line);
      std::string        cell;

      std::getline(lineStream,cell,',');
      row_labels.append(cell+",");

      std::getline(lineStream,cell);
      return_string.append("[");
      cell.pop_back();
      return_string.append(cell);
      return_string.append("],");     

  }

  return_string.pop_back();
  return_string.append("]");

  row_labels.pop_back();
  return_string.append(row_labels);
  return_string.append("]}");

  napi_value return_napi_string;

  status = napi_create_string_utf8(env, return_string.c_str(), return_string.length(), &return_napi_string);

  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to create return value");
  }

  return return_napi_string;
}

napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_value fn;

  status = napi_create_function(env, NULL, 0, ParseCsv, NULL, &fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to wrap native function");
  }

  status = napi_set_named_property(env, exports, "parse_csv", fn);
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Unable to populate exports");
  }

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)