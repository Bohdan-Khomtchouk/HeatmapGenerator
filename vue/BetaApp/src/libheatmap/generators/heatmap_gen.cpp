/* heatmap - High performance heatmap creation in C.
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2013 Lucas Beyer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

#include <algorithm>
#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <map>
#include <vector>
#include <node_api.h>

#include "lodepng.h"
#include "heatmap.h"

#include "colorschemes/gray.h"
#include "colorschemes/Blues.h"
#include "colorschemes/BrBG.h"
#include "colorschemes/BuGn.h"
#include "colorschemes/BuPu.h"
#include "colorschemes/GnBu.h"
#include "colorschemes/Greens.h"
#include "colorschemes/Greys.h"
#include "colorschemes/Oranges.h"
#include "colorschemes/OrRd.h"
#include "colorschemes/PiYG.h"
#include "colorschemes/PRGn.h"
#include "colorschemes/PuBuGn.h"
#include "colorschemes/PuBu.h"
#include "colorschemes/PuOr.h"
#include "colorschemes/PuRd.h"
#include "colorschemes/Purples.h"
#include "colorschemes/RdBu.h"
#include "colorschemes/RdGy.h"
#include "colorschemes/RdPu.h"
#include "colorschemes/RdYlBu.h"
#include "colorschemes/RdYlGn.h"
#include "colorschemes/Reds.h"
#include "colorschemes/Spectral.h"
#include "colorschemes/YlGnBu.h"
#include "colorschemes/YlGn.h"
#include "colorschemes/YlOrBr.h"
#include "colorschemes/YlOrRd.h"

// Too bad C++ doesn't have nice mad reflection skillz!
std::map<std::string, const heatmap_colorscheme_t*> g_schemes = {
    {"b2w", heatmap_cs_b2w},
    {"b2w_opaque", heatmap_cs_b2w_opaque},
    {"w2b", heatmap_cs_w2b},
    {"w2b_opaque", heatmap_cs_w2b_opaque},
    {"Blues_discrete", heatmap_cs_Blues_discrete},
    {"Blues_soft", heatmap_cs_Blues_soft},
    {"Blues_mixed", heatmap_cs_Blues_mixed},
    {"Blues_mixed_exp", heatmap_cs_Blues_mixed_exp},
    {"BrBG_discrete", heatmap_cs_BrBG_discrete},
    {"BrBG_soft", heatmap_cs_BrBG_soft},
    {"BrBG_mixed", heatmap_cs_BrBG_mixed},
    {"BrBG_mixed_exp", heatmap_cs_BrBG_mixed_exp},
    {"BuGn_discrete", heatmap_cs_BuGn_discrete},
    {"BuGn_soft", heatmap_cs_BuGn_soft},
    {"BuGn_mixed", heatmap_cs_BuGn_mixed},
    {"BuGn_mixed_exp", heatmap_cs_BuGn_mixed_exp},
    {"BuPu_discrete", heatmap_cs_BuPu_discrete},
    {"BuPu_soft", heatmap_cs_BuPu_soft},
    {"BuPu_mixed", heatmap_cs_BuPu_mixed},
    {"BuPu_mixed_exp", heatmap_cs_BuPu_mixed_exp},
    {"GnBu_discrete", heatmap_cs_GnBu_discrete},
    {"GnBu_soft", heatmap_cs_GnBu_soft},
    {"GnBu_mixed", heatmap_cs_GnBu_mixed},
    {"GnBu_mixed_exp", heatmap_cs_GnBu_mixed_exp},
    {"Greens_discrete", heatmap_cs_Greens_discrete},
    {"Greens_soft", heatmap_cs_Greens_soft},
    {"Greens_mixed", heatmap_cs_Greens_mixed},
    {"Greens_mixed_exp", heatmap_cs_Greens_mixed_exp},
    {"Greys_discrete", heatmap_cs_Greys_discrete},
    {"Greys_soft", heatmap_cs_Greys_soft},
    {"Greys_mixed", heatmap_cs_Greys_mixed},
    {"Greys_mixed_exp", heatmap_cs_Greys_mixed_exp},
    {"Oranges_discrete", heatmap_cs_Oranges_discrete},
    {"Oranges_soft", heatmap_cs_Oranges_soft},
    {"Oranges_mixed", heatmap_cs_Oranges_mixed},
    {"Oranges_mixed_exp", heatmap_cs_Oranges_mixed_exp},
    {"OrRd_discrete", heatmap_cs_OrRd_discrete},
    {"OrRd_soft", heatmap_cs_OrRd_soft},
    {"OrRd_mixed", heatmap_cs_OrRd_mixed},
    {"OrRd_mixed_exp", heatmap_cs_OrRd_mixed_exp},
    {"PiYG_discrete", heatmap_cs_PiYG_discrete},
    {"PiYG_soft", heatmap_cs_PiYG_soft},
    {"PiYG_mixed", heatmap_cs_PiYG_mixed},
    {"PiYG_mixed_exp", heatmap_cs_PiYG_mixed_exp},
    {"PRGn_discrete", heatmap_cs_PRGn_discrete},
    {"PRGn_soft", heatmap_cs_PRGn_soft},
    {"PRGn_mixed", heatmap_cs_PRGn_mixed},
    {"PRGn_mixed_exp", heatmap_cs_PRGn_mixed_exp},
    {"PuBuGn_discrete", heatmap_cs_PuBuGn_discrete},
    {"PuBuGn_soft", heatmap_cs_PuBuGn_soft},
    {"PuBuGn_mixed", heatmap_cs_PuBuGn_mixed},
    {"PuBuGn_mixed_exp", heatmap_cs_PuBuGn_mixed_exp},
    {"PuBu_discrete", heatmap_cs_PuBu_discrete},
    {"PuBu_soft", heatmap_cs_PuBu_soft},
    {"PuBu_mixed", heatmap_cs_PuBu_mixed},
    {"PuBu_mixed_exp", heatmap_cs_PuBu_mixed_exp},
    {"PuOr_discrete", heatmap_cs_PuOr_discrete},
    {"PuOr_soft", heatmap_cs_PuOr_soft},
    {"PuOr_mixed", heatmap_cs_PuOr_mixed},
    {"PuOr_mixed_exp", heatmap_cs_PuOr_mixed_exp},
    {"PuRd_discrete", heatmap_cs_PuRd_discrete},
    {"PuRd_soft", heatmap_cs_PuRd_soft},
    {"PuRd_mixed", heatmap_cs_PuRd_mixed},
    {"PuRd_mixed_exp", heatmap_cs_PuRd_mixed_exp},
    {"Purples_discrete", heatmap_cs_Purples_discrete},
    {"Purples_soft", heatmap_cs_Purples_soft},
    {"Purples_mixed", heatmap_cs_Purples_mixed},
    {"Purples_mixed_exp", heatmap_cs_Purples_mixed_exp},
    {"RdBu_discrete", heatmap_cs_RdBu_discrete},
    {"RdBu_soft", heatmap_cs_RdBu_soft},
    {"RdBu_mixed", heatmap_cs_RdBu_mixed},
    {"RdBu_mixed_exp", heatmap_cs_RdBu_mixed_exp},
    {"RdGy_discrete", heatmap_cs_RdGy_discrete},
    {"RdGy_soft", heatmap_cs_RdGy_soft},
    {"RdGy_mixed", heatmap_cs_RdGy_mixed},
    {"RdGy_mixed_exp", heatmap_cs_RdGy_mixed_exp},
    {"RdPu_discrete", heatmap_cs_RdPu_discrete},
    {"RdPu_soft", heatmap_cs_RdPu_soft},
    {"RdPu_mixed", heatmap_cs_RdPu_mixed},
    {"RdPu_mixed_exp", heatmap_cs_RdPu_mixed_exp},
    {"RdYlBu_discrete", heatmap_cs_RdYlBu_discrete},
    {"RdYlBu_soft", heatmap_cs_RdYlBu_soft},
    {"RdYlBu_mixed", heatmap_cs_RdYlBu_mixed},
    {"RdYlBu_mixed_exp", heatmap_cs_RdYlBu_mixed_exp},
    {"RdYlGn_discrete", heatmap_cs_RdYlGn_discrete},
    {"RdYlGn_soft", heatmap_cs_RdYlGn_soft},
    {"RdYlGn_mixed", heatmap_cs_RdYlGn_mixed},
    {"RdYlGn_mixed_exp", heatmap_cs_RdYlGn_mixed_exp},
    {"Reds_discrete", heatmap_cs_Reds_discrete},
    {"Reds_soft", heatmap_cs_Reds_soft},
    {"Reds_mixed", heatmap_cs_Reds_mixed},
    {"Reds_mixed_exp", heatmap_cs_Reds_mixed_exp},
    {"Spectral_discrete", heatmap_cs_Spectral_discrete},
    {"Spectral_soft", heatmap_cs_Spectral_soft},
    {"Spectral_mixed", heatmap_cs_Spectral_mixed},
    {"Spectral_mixed_exp", heatmap_cs_Spectral_mixed_exp},
    {"YlGnBu_discrete", heatmap_cs_YlGnBu_discrete},
    {"YlGnBu_soft", heatmap_cs_YlGnBu_soft},
    {"YlGnBu_mixed", heatmap_cs_YlGnBu_mixed},
    {"YlGnBu_mixed_exp", heatmap_cs_YlGnBu_mixed_exp},
    {"YlGn_discrete", heatmap_cs_YlGn_discrete},
    {"YlGn_soft", heatmap_cs_YlGn_soft},
    {"YlGn_mixed", heatmap_cs_YlGn_mixed},
    {"YlGn_mixed_exp", heatmap_cs_YlGn_mixed_exp},
    {"YlOrBr_discrete", heatmap_cs_YlOrBr_discrete},
    {"YlOrBr_soft", heatmap_cs_YlOrBr_soft},
    {"YlOrBr_mixed", heatmap_cs_YlOrBr_mixed},
    {"YlOrBr_mixed_exp", heatmap_cs_YlOrBr_mixed_exp},
    {"YlOrRd_discrete", heatmap_cs_YlOrRd_discrete},
    {"YlOrRd_soft", heatmap_cs_YlOrRd_soft},
    {"YlOrRd_mixed", heatmap_cs_YlOrRd_mixed},
    {"YlOrRd_mixed_exp", heatmap_cs_YlOrRd_mixed_exp},
};


napi_value Init(napi_env env, napi_value exports) {
    // Module initialization code goes here
    napi_status status;
    napi_value fn;

    // Arguments 2 and 3 are function name and length respectively
    // We will leave them as empty for this example
    status = napi_create_function(env, NULL, 0, C_Parse_Csv, NULL, &fn);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to wrap native function");
    }

    status = napi_set_named_property(env, exports, "C_Parse_Csv", fn);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Unable to populate exports");
    }
    
    return exports;
}

NAPI_MODULE(heatmap_gen, Init)

napi_value C_Parse_Csv(napi_env env, napi_callback_info info) {
    napi_status;
    size_t argc = 1;
    napi_value argv[1];
    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Failed to parse arguments")
    }   
    
    char* csv_path;
    status = napi_get_value_string_utf8(env, argv[0], &csv_file_path);
    if (status != napi_ok) {
        napi_throw_error(env, NULL, "Invalid csv file path")
    }
    
    std::ifstream ifile;
    ifile.open(csv_path);
    if(!ifile) {
        std::cerr << "CSV file does not exist at given filepath" << std::endl;
        return 1;
    }

    unsigned row_num = 0;
    unsigned col_num = 0;
    std::ifstream  data(csv_path);
    std::string line;
    while(std::getline(data,line))
    {
        std::stringstream  lineStream(line);
        std::string        cell;
        
        if (row_num == 0){
            while(std::getline(lineStream,cell,','))
            {
                col_num += 1;
            }
        }
        else{
            row_num += 1;
        }
    }

    col_num -= 1; // Exclude the extra label column
    row_num -= 1; // Exclude the extra label row

    size_t size_heatmap_values = col_num * row_num;
    std::vector heatmap_values(size_heatmap_values);

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

        while(std::getline(lineStream,cell,','))
        {
            if (j == 0){
                j += 1;
                continue;
            }
            weight = std::stof(cell);
            heatmap_values.push_back(weight);

            j += 1;

        }
        i += 1;
    }

    struct return_data_struct {
        uint32_t col_num = col_num;
        uint32_t row_num = row_num;
        std::vector heatmap_values = heatmap_values;
    }

    return return_data_struct;

}

"""
int main(int argc, char* argv[])
{
    if(argc == 2 && std::string(argv[1]) == "-l") {
        for(auto& scheme : g_schemes) {
            std::cout << "  " << scheme.first << std::endl;
        }
        return 0;
    }
#ifdef FIT_IMAGE
    if(argc < 6 || 7 < argc) {
#else      
    if(argc < 8 || 9 < argc) {
#endif 
        std::cerr << std::endl << "Invalid number of arguments!" << std::endl;
        std::cout << "Usage:" << std::endl;
#ifdef FIT_IMAGE
        std::cout << "  " << argv[0] << " image_width image_height num_data_cols num_data_rows csv_data_filename [colorscheme]" << std::endl;
#else      
        std::cout << "  " << argv[0] << " image_width image_height tile_ratio_x tile_ratio_y num_data_cols num_data_rows csv_data_filename [colorscheme]" << std::endl;
#endif 
        std::cout << std::endl;
        std::cout << "  To get a list of available colorschemes, run" << std::endl;
        std::cout << "  " << argv[0] << " -l" << std::endl;
        std::cout << "  The default colorscheme is Spectral_mixed." << std::endl << std::endl;

        return 1;
    }
    
    const unsigned image_width = atoi(argv[1]), image_height = atoi(argv[2]);

#ifdef FIT_IMAGE
    const unsigned num_data_cols = atoi(argv[3]); 
    const unsigned num_data_rows = atoi(argv[4]);   
    const char* csv_path = argv[5];    

    if (image_width < num_data_cols || image_height < num_data_rows) {
        std::cerr << std::endl << "Image dimensions must be at least the dimensions of the data." << std::endl;
        std::cout << "Specifically, the following must be true: " << std::endl;
        std::cout << " image_width > num_data_cols" << std::endl;
        std::cout << " image_height > num_data_rows" << std::endl << std::endl;

        return 1;
    }        

    // Calculate appropriate sizing for tile
    unsigned tile_width =  (int) (image_width / (num_data_cols));
    // std::cerr << "tile_width: " << tile_width << std::endl;
    unsigned tile_height = (int) (image_height / (num_data_rows));
    // std::cerr << "tile_height: " << tile_height << std::endl;

    if(argc >= 7 && g_schemes.find(argv[6]) == g_schemes.end()) {
        std::cerr << "Unknown colorscheme. Run " << argv[0] << " -l for a list of valid ones." << std::endl;
        return 1;
    }
    const heatmap_colorscheme_t* colorscheme = argc == 7 ? g_schemes[argv[6]] : heatmap_cs_default;

#else
    const unsigned tile_ratio_x = argc >= 8 ? atoi(argv[3]) : 1; 
    const unsigned tile_ratio_y = argc >= 8 ? atoi(argv[4]) : 1; 
    const unsigned num_data_cols = argc >= 8 ? atoi(argv[5]) : atoi(argv[3]); 
    const unsigned num_data_rows = argc >= 8 ? atoi(argv[6]) : atoi(argv[4]);     
    const char* csv_path = argv[7];

    if (image_width < (tile_ratio_x * num_data_cols) || image_height < (tile_ratio_y * num_data_rows)) {
        std::cerr << std::endl << "Image dimensions are not enough to accomodate tile dimensions and amount of data." << std::endl;
        std::cout << "Specifically, the following must be true: " << std::endl;
        std::cout << " image_width >= (tile_ratio_x * num_data_cols)" << std::endl;
        std::cout << " image_height >= (tile_ratio_y * num_data_rows)" << std::endl << std::endl;

        return 1;
    }

    // Calculate appropiate sizing for tile
    unsigned max_x_scaling_factor =  (int) (image_width / (num_data_cols * tile_ratio_x));
    // std::cerr << "max_x_scaling_factor: " << max_x_scaling_factor << std::endl;
    unsigned max_y_scaling_factor = (int) (image_height / (num_data_rows * tile_ratio_y));
    // std::cerr << "max_y_scaling_factor: " << max_y_scaling_factor << std::endl;
    unsigned scaling_factor = std::min(max_x_scaling_factor,max_y_scaling_factor);
    // std::cerr << "scaling_factor: " << scaling_factor << std::endl;
    unsigned tile_width = scaling_factor * tile_ratio_x;
    // std::cerr << "tile_width: " << tile_width << std::endl;
    unsigned tile_height = scaling_factor * tile_ratio_y;
    // std::cerr << "tile_height: " << tile_height << std::endl;

    if(argc >= 9 && g_schemes.find(argv[8]) == g_schemes.end()) {
        std::cerr << "Unknown colorscheme. Run " << argv[0] << " -l for a list of valid ones." << std::endl;
        return 1;
    }
    const heatmap_colorscheme_t* colorscheme = argc == 9 ? g_schemes[argv[8]] : heatmap_cs_default;

#endif

    std::ifstream ifile;
    ifile.open(csv_path);
    if(!ifile) {
        std::cerr << "CSV file does not exist at given filepath" << std::endl;
        return 1;
    }

    unsigned updated_image_width = tile_width * num_data_cols;
    // std::cerr << "updated_image_width: " << updated_image_width << std::endl;
    unsigned updated_image_height = tile_height * num_data_rows;
    // std::cerr << "updated_image_height: " << updated_image_height << std::endl;

    heatmap_t* hm = heatmap_new(updated_image_width, updated_image_height);
    heatmap_stamp_t* tile = heatmap_stamp_gen(tile_width, tile_height);

    unsigned int x, y;
    float weight;
    unsigned int row_num = 0;

    std::ifstream  data(csv_path);
    std::string line;
    while(std::getline(data,line))
    {
        std::stringstream  lineStream(line);
        std::string        cell;
        
        if (row_num == 0){
            row_num += 1;
            continue;
        }
        y = (row_num - 0.5) * tile_height;
        int col_num = 0;

        while(std::getline(lineStream,cell,','))
        {
            if (col_num == 0){
                col_num += 1;
                continue;
            }
            x = (col_num - 0.5) * tile_width;
            weight = std::stof(cell);

            if(x < updated_image_width && y < updated_image_height) {
                heatmap_add_weighted_point_with_stamp(hm, x, y, weight, tile);
            } else {
                std::cerr << "Warning: Skipping out-of-bound input coordinate: (" << x << "," << y << ")." << std::endl;
            }
            col_num += 1;

        }
        row_num += 1;
    }

    heatmap_stamp_free(tile);

    std::vector<unsigned char> image(updated_image_width*updated_image_height*4);
    heatmap_render_to(hm, colorscheme, &image[0]);
    heatmap_free(hm);

    std::vector<unsigned char> png;
    if(unsigned error = lodepng::encode(png, image, updated_image_width, updated_image_height)) {
        std::cerr << "encoder error " << error << ": "<< lodepng_error_text(error) << std::endl;
        return 1;
    }

    // lodepng::save_file(png, output_png_name);
    std::cout.write((char*)&png[0], png.size());

    return 0;
}
"""