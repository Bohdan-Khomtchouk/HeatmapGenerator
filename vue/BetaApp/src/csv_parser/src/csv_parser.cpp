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

  
  // unsigned row_num = 0;
  // unsigned col_num = 0;
  // std::ifstream  data(csv_path);
  // std::string line;
  // while(std::getline(data,line))
  // {
  //     std::stringstream  lineStream(line);
  //     std::string        cell;
      
  //     if (row_num == 0){
  //         while(std::getline(lineStream,cell,','))
  //         {
  //             col_num += 1;
  //         }
  //     }
  //     else{
  //         row_num += 1;
  //     }
  // }

  // col_num -= 1; // Exclude the extra label column
  // row_num -= 1; // Exclude the extra label row
  
  
  // Stringify 2D array
  std::string return_string = "{Result:[";

  std::ifstream  data(csv_path);
  std::string line;

  unsigned i = 0;
  unsigned j = 0;

  while(std::getline(data,line))
  {
      std::stringstream  lineStream(line);
      std::string        cell;
      
      if (i == 0){
          i += 1;
          continue;
      }
      j = 0;

      return_string.append("[");

      while(std::getline(lineStream,cell,','))
      {
          if (j == 0){
              j += 1;
              continue;
          }
          float weight = std::stof(cell);
          return_string.append(std::to_string(weight)+",");
          j += 1;

      }
      return_string.pop_back();
      return_string.append("],");     
      i += 1;
  }

  return_string.pop_back();
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